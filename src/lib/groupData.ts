// utils/groupData.ts
export function groupData<T>(
  data: T[],
  groupBy?: (item: T) => string
): Record<string, T[]> {
  if (!groupBy) return { All: data }

  return data.reduce((acc, item) => {
    const key = groupBy(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
