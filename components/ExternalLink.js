import { ExternalLinkIcon } from '@heroicons/react/outline'

export function ExternalIcon({ href }) {
  return (
    <a href={href} className='inline-flex items-center' target='_blank' rel='noreferrer'>
      <ExternalLinkIcon className='inline-block w-4 ml-1 hover:text-primary' aria-hidden='true' />
    </a>
  )
}

export function ExternalToken({ href, name }) {
  return (
    <a
      className='text-xs text-gray-500 hover:text-primary hover:underline'
      href={href}
      target='_blank'
      rel='noreferrer'
    >
      {name}
    </a>
  )
}