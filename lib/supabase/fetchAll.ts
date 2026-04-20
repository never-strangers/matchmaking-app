const PAGE_SIZE = 1000;

/**
 * Paginated fetch that works around Supabase's default 1000-row limit.
 * Pass a factory that builds a fresh query — the helper appends .range() and
 * iterates until all rows are collected.
 */
export async function fetchAllRows<T>(
  queryFn: (offset: number, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await queryFn(offset, PAGE_SIZE);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}
