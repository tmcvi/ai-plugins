"""S-curve delivery profile generator (brief section 5.1).

For duration N weeks and steepness k:
    F(w) = 1 / (1 + exp(-k * (w/N - 0.5)))
    G(w) = (F(w) - F(0)) / (F(N) - F(0))
    p(w) = G(w) - G(w-1)   for w = 1..N, zero beyond

Shares are rounded to 0.1% and any rounding residue is placed on week N so
every row sums to exactly 100%.
"""
import math

DEFAULT_STEEPNESS = 6.0

# Deal Size -> duration in weeks (mirrors ASM Project Duration Weeks seeds)
DURATIONS = {"Small": 8, "Medium": 14, "Large": 24, "Very Large": 36}


def profile(n_weeks, steepness=DEFAULT_STEEPNESS, max_weeks=52):
    """Return a list of `max_weeks` decimal shares summing to exactly 1."""
    if n_weeks < 1:
        raise ValueError("n_weeks must be at least 1")

    def f(w):
        return 1.0 / (1.0 + math.exp(-steepness * (w / n_weeks - 0.5)))

    f0, fn = f(0), f(n_weeks)
    span = fn - f0

    def g(w):
        return (f(w) - f0) / span

    # round to 0.1% == 3 decimal places on the decimal share
    shares = [round(g(w) - g(w - 1), 3) for w in range(1, n_weeks + 1)]
    residue = round(1.0 - sum(shares), 3)
    shares[-1] = round(shares[-1] + residue, 3)

    return shares + [0.0] * (max_weeks - n_weeks)


def rows(durations=None, steepness=DEFAULT_STEEPNESS, max_weeks=52):
    """Rows of [Deal Size, Project Week, value] ready for set_metric_input."""
    durations = durations or DURATIONS
    out = []
    for size, n in durations.items():
        for i, share in enumerate(profile(n, steepness, max_weeks), start=1):
            out.append([size, "W%02d" % i, "%.3f" % share])
    return out


if __name__ == "__main__":
    import json
    import sys

    if "--check" in sys.argv:
        for size, n in DURATIONS.items():
            p = profile(n, max_weeks=52)
            total = round(sum(p), 6)
            nonzero = [round(x * 100, 1) for x in p[:n]]
            assert total == 1.0, "%s sums to %s" % (size, total)
            assert all(x == 0.0 for x in p[n:]), "%s has non-zero tail" % size
            print("%-11s N=%2d sum=%.1f%%  %s" % (size, n, total * 100, nonzero))
    else:
        print(json.dumps(rows()))
