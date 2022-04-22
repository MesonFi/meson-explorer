import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html className='h-full'>
      <Head>
        <link rel='stylesheet' href='https://rsms.me/inter/inter.css' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='true' />
        <link href={`https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&family=Nunito:wght@600;800&display=swap`} rel='stylesheet'></link>
      </Head>
      <body className='h-full bg-gray-100'>
        <Main />
      </body>
    </Html>
  )
}
