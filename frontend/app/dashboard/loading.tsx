export default function Loading() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-24 rounded-2xl bg-linear-to-r from-[#2C5AA0]/40 via-purple-500/40 to-teal-400/40" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-purple-200/50 dark:bg-purple-500/20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-72 rounded-xl bg-blue-200/50 dark:bg-blue-500/20" />
        <div className="h-72 rounded-xl bg-teal-200/50 dark:bg-teal-500/20" />
      </div>
    </div>
  )
}