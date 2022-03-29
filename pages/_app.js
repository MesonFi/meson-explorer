import React from 'react'
import Head from 'next/head'
import '../styles/globals.css'
import Navbar from '../components/Navbar'
import AppContext from '../lib/context'

export default function App({ Component, pageProps }) {
  const [globalState, setGlobalState] = React.useState({})

  return (
    <>
      <Head>
        <title>Meson Explorer</title>
      </Head>
      <Navbar browserExt={globalState.browserExt} setGlobalState={setGlobalState} />
      <div className='flex-1 overflow-hidden'>
        <div className='h-full overflow-auto'>
          <div className='mx-auto max-w-7xl'>
            <div className='inline-block min-w-full px-2 py-2 align-middle sm:py-4 sm:px-4 lg:py-6 lg:px-8'>
              <AppContext.Provider value={globalState}>
                <Component {...pageProps} />
              </AppContext.Provider>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
