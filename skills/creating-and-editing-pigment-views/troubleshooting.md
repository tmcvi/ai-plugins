# Troubleshooting

## View Creation Fails (Pivot Fields)

**Symptoms:**

- Error: "Dimension ID not found"
- Error: "Invalid pivot field configuration"
- Pivot field is silently removed during View creation

**Solutions:**

1. Verify Dimension IDs exist in the application
2. Check that Dimension is actually a Dimension of the underlying Metric/List
3. Ensure pivot field kind matches (Dimension vs Scenario)
4. For Grouping pivots with `listPropertyPath`:
   - Verify the source Dimension exists in the List cache
   - Check that each Property in the path exists on the respective Dimensions
   - Ensure the List Property path uses **friendly names** (the display names shown to users)
   - Verify the Dimension is part of the allowed Dimensions (determined by Metrics in valueFields)

## Filters Are Being Removed (Silently Sanitized)

**Symptoms:**

- Filter was provided in the create_view call but is missing from the created View
- Filter appears to be ignored during view creation
- No error message, but the filter just doesn't appear

**Root Cause:**
The filter failed validation during view sanitization and was removed. This happens when:

1. **Wrong pivotFieldId source (MOST COMMON)**: The `pivotFieldId` in the filter references a pivot from the **pages array** instead of from rows/columns.
   - **Why it fails**: Filters are only validated against `DimensionalPivotFields`, which only includes pivots from rows and columns
   - **How to fix**: Always use a pivotFieldId from the rows or columns arrays, never from pages
   - **Example**: If filtering on Product Dimension, ensure Product is in rows or columns, then use that pivot's ID

2. **Missing projections for ValueField filters**: If filtering on a pivot in one axis (e.g., rows) and there are pivots on the opposite axis (e.g., columns), you MUST provide projections for each opposite-axis pivot.

3. **Invalid pivot reference**: The `pivotFieldId` doesn't reference the innermost pivot on its axis.

4. **Invalid value field reference**: The `valueFieldId` doesn't exist in the View's value fields.

5. **Invalid comparison operator**: The operator doesn't match the Metric type (e.g., using "Contains" on a numeric Metric).

6. **Invalid List Property path**: For PivotListProperty filters, the Property path doesn't exist on the Dimension.

**Solutions:**

1. **CRITICAL: Always use pivotFieldId from rows or columns, NEVER from pages**:
   - Check that the Dimension you want to filter on appears in rows or columns
   - If it only appears in pages, you need to add it to rows or columns first
   - Use the pivotFieldId from that row/column entry

2. **Always provide projections for ValueField filters** when the opposite axis has pivots:

   ```json
   "projections": [
     {
       "pivotFieldId": "<column-pivot-id>",
       "modalityId": "<first-modality-of-that-dimension>"
     }
   ]
   ```

3. Use the GetBlockViews tool to inspect an existing similar view to see how filters are structured

4. Verify all IDs refer to an existing pivot and the pivots exist in rows/columns (not pages!)

## Grouping Pivot Silently Dropped from Columns

**Symptoms:**

- A Grouping pivot (with `listPropertyPath`) added to Columns is missing from the created View
- Columns array in the API response contains only the Dimension pivot, not the Grouping pivot
- No error is returned — the Grouping is silently discarded

**Root Cause:**
The Pigment API does not allow the same `dimensionId` to appear twice on the same axis (Rows or Columns). When you add both:
1. A Grouping pivot (`dimensionId: X`, `listPropertyPath: ["SomeProperty"]`) AND
2. A Dimension pivot (`dimensionId: X`)

to the same Columns (or Rows) array, the Grouping pivot is silently dropped.

This is an API-level constraint. The Pigment web UI can configure this through drag-and-drop but the API rejects the combination.

**When this typically occurs:**
- Trying to add a "Period Type" grouping header above Month columns (e.g., group months into "Actual" and "Plan" bands)
- Trying to add a "Quarter" grouping above Month columns while Month remains as the detail pivot

**Workarounds:**

1. **Move the Grouping to Pages**: Put the Grouping pivot (e.g., Period Type) in Pages instead of Columns. Users can then toggle between "Actual" and "Plan" via the page selector. Not a visual column grouping, but functionally communicates the same information.

2. **Use the Pigment UI**: Configure the column grouping manually in the Pigment web interface after creating the base view via the API. The UI supports drag-and-drop to add a property as a column grouping header above an existing dimension.

3. **Replace the Dimension pivot with the Grouping**: If you only need the group-level columns (not individual leaf items), put just the Grouping pivot in Columns and remove the Dimension pivot. This shows "Actual" and "Plan" columns (aggregated), not individual months.

**Note about Pages Groupings:**
A Grouping pivot on the SAME dimension works fine when placed in Pages while the Dimension pivot is in Columns (different axes). The constraint only applies when both are on the same axis.

## View Shows No Data

**Symptoms:**

- View created but displays empty

**Solutions:**

1. Check filters - may be filtering out all data
2. Verify underlying Metric/List has data
3. Check `show_empty_rows` and `show_empty_columns` settings
4. Ensure value fields are set to `displayed: true`

## Performance Issues

**Symptoms:**

- View takes a long time to load
- Browser becomes unresponsive

**Solutions:**

1. Add more aggressive filters to reduce data volume
2. Reduce number of breakdowns
3. Set `show_empty_rows: false` and `show_empty_columns: false`
4. Use pages with `single_modality: true` to limit data
