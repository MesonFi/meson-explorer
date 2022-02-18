import Head from 'next/head'
import '../styles/globals.css'
import Navbar from '../components/Navbar'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Meson Explorer</title>
      </Head>
      <Navbar />
      <div className='flex-1 overflow-hidden'>
        <div className='h-full overflow-auto'>
          <div className='mx-auto max-w-7xl'>
            <div className='inline-block min-w-full px-2 py-2 align-middle sm:py-4 sm:px-4 lg:py-6 lg:px-8'>
              <Component {...pageProps} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
