import { currentHostingerAccountUser, hostingerRequest } from './hostingerApi'
type Row = Record<string, unknown>
type Failure = { message: string }
type Result<T> = { data: T; error: null; count: number | null } | { data: null; error: Failure; count: null }
type Query = { table: string; operation: string; columns: string; filters: { column: string; operator: string; value: unknown }[]; orders: { column: string; ascending: boolean }[]; offset: number; limit: number; values?: Row | Row[]; count?: boolean }
class DataQuery implements PromiseLike<Result<Row[]>> {
  private query: Query
  private userId = currentHostingerAccountUser()
  constructor(table: string) { this.query = { table, operation: 'select', columns: '*', filters: [], orders: [], offset: 0, limit: 1000 } }
  select(columns = '*', options?: { count: 'exact' }) { this.query.columns = columns; this.query.count = !!options?.count; return this }
  eq(column: string, value: unknown) { return this.filter(column, 'eq', value) }
  is(column: string, value: null) { return this.filter(column, 'is', value) }
  not(column: string, operator: 'is', value: null) { return this.filter(column, `not.${operator}`, value) }
  in(column: string, value: unknown[]) { return this.filter(column, 'in', value) }
  ilike(column: string, value: string) { return this.filter(column, 'ilike', value) }
  gte(column: string, value: unknown) { return this.filter(column, 'gte', value) }
  gt(column: string, value: unknown) { return this.filter(column, 'gt', value) }
  private filter(column: string, operator: string, value: unknown) { this.query.filters.push({ column, operator, value }); return this }
  order(column: string, options?: { ascending?: boolean }) { this.query.orders.push({ column, ascending: options?.ascending !== false }); return this }
  range(start: number, end: number) { this.query.offset = start; this.query.limit = end - start + 1; return this }
  limit(limit: number) { this.query.limit = limit; return this }
  insert(values: Row | Row[]) { this.query.operation = 'insert'; this.query.values = values; return this }
  update(values: Row) { this.query.operation = 'update'; this.query.values = values; return this }
  upsert(values: Row, options: { onConflict: string }) { if (options.onConflict !== 'user_id') throw new Error('Unsupported account data operation.'); this.query.operation = 'upsert'; this.query.values = values; return this }
  delete() { this.query.operation = 'delete'; return this }
  private async execute(): Promise<Result<Row[]>> {
    try {
      if (!this.userId || this.userId !== currentHostingerAccountUser()) throw new Error('Sign in again to access your factbook.')
      const data = await hostingerRequest<{ data: Row[]; count: number | null }>('factbook/data.php', { method: 'POST', headers: { 'X-CSSV-User': this.userId }, body: JSON.stringify(this.query) })
      if (this.userId !== currentHostingerAccountUser()) throw new Error('Your account changed. Open your factbook again.')
      return { ...data, error: null }
    } catch (error) { return { data: null, count: null, error: { message: error instanceof Error ? error.message : 'Your factbook could not be loaded.' } } }
  }
  then<TResult1 = Result<Row[]>, TResult2 = never>(onfulfilled?: ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> { return this.execute().then(onfulfilled, onrejected) }
  async single(): Promise<Result<Row>> {
    const result = await this.execute()
    if (result.error) return result
    if (result.data.length !== 1) return { data: null, error: { message: 'This factbook item could not be found.' }, count: null }
    return { data: result.data[0], count: result.count, error: null }
  }
  async maybeSingle(): Promise<Result<Row | null>> {
    const result = await this.execute()
    if (result.error) return result
    if (result.data.length > 1) return { data: null, error: { message: 'The account data could not be loaded.' }, count: null }
    return { data: result.data[0] ?? null, count: result.count, error: null }
  }
}
export class HostingerDataClient { from(table: string) { return new DataQuery(table) } }
export async function getHostingerDataClient() { return new HostingerDataClient() }
export async function factbookAction<T>(action: string, input: Row, userId: string): Promise<T> {
  if (userId !== currentHostingerAccountUser()) throw new Error('Sign in again to continue.')
  const result = await hostingerRequest<T>('factbook/data.php', { method: 'POST', headers: { 'X-CSSV-User': userId }, body: JSON.stringify({ action, ...input }) })
  if (userId !== currentHostingerAccountUser()) throw new Error('Your account changed. Please open your factbook again.')
  return result
}
export function factbookMediaUrl(id: string) { return `/api/factbook/media.php?id=${encodeURIComponent(id)}` }
