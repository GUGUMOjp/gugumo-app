# Upload Transaction Design

## Current Behavior

- One browser upload operation can contain multiple CSV files.
- The client parses CSV files and sends records to a Server Action.
- `saveCsvUploadRecords` inserts records sequentially into `csv_uploads`.
- If one insert fails, earlier inserts may already be committed.

## Partial Failure Risk

Example:

1. File A insert succeeds.
2. File B insert fails.
3. The UI shows save failure.
4. A retry may warn about File A checksum while File B is still missing.

## Relationship To Checksum Warning

- New rows with checksum are checked by `workspace_id + checksum`.
- Legacy checksum NULL rows are intentionally not duplicate targets.
- Partial success can make a retry show warnings for files saved in the previous failed operation.

## Safe Improvement Options

### Short Term

- Keep customer-facing error message generic.
- After failure, reload upload history so the user can see what was saved.
- Do not pretend the operation was atomic.

### Medium Term

- Add an `upload_batch_id` column.
- Save each operation as a batch.
- Mark batch status as `processing`, `complete`, or `failed`.
- Show partial batch status in the upload history.

### Strong Transaction Option

Use a database RPC that receives validated records and inserts the whole batch in one transaction.

Requirements:

- SQL function reviewed before applying.
- RLS-compatible implementation.
- No Service Role in normal user operations.
- Clear payload limit strategy.

## Recommendation

Do not implement a pseudo-transaction in application code. For beta, document partial failure behavior and build an RPC/batch design before stronger guarantees are promised.

