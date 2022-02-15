import classnames from 'classnames'

export default function Button({ active, rounded, disabled, className, onClick, children }) {
  return (
    <div
      className={classnames(
        'relative inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-medium text-gray-700',
        active && 'z-10 bg-primary-100 border-primary text-primary hover:bg-indigo-50',
        disabled ? 'text-gray-200 hover:text-gray-200 cursor-not-allowed' : 'cursor-pointer',
        rounded && 'rounded-md',
        className
      )}
      onClick={() => !disabled && onClick()}
    >
      {children}
    </div>
  )
}
