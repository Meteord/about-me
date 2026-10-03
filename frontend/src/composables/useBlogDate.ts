const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatBlogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return isoDate
  return `${MONTHS[month - 1]} ${day}, ${year}`
}
