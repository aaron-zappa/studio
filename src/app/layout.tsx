
'use client'; // Add 'use client' directive

import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google'; // Keep Geist_Mono if used specifically by Client Components
// Import Geist Sans separately if needed only by Server Components (though layout is now client)
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/providers/query-provider'; // Import the provider
import { Button } from '@/components/ui/button'; // Import Button
import { Info } from 'lucide-react'; // Import Info icon
import React from 'react'; // Import React for useEffect

// If Geist Sans is needed, instantiate it here.
// Note: Using fonts directly in Client Components like this is fine.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata can still be defined, but it might behave slightly differently
// for client-rendered layouts compared to server-rendered ones.
// For static metadata, this is generally fine. Dynamic metadata might need adjustments.
// export const metadata: Metadata = { // Metadata export is generally for Server Components
//   title: 'CellConnect',
//   description: 'AI Network Simulation',
// };
// Consider setting title dynamically using document.title in a useEffect if needed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Since this is now a Client Component, 'metadata' object export won't work directly.
  // Setting title/metadata might need to be handled differently if dynamic.
  // For a static title, you can set it in the <head> directly or use useEffect.

   // Handler for opening the help file
   const handleOpenHelp = () => {
    window.open('/help.html', '_blank', 'noopener,noreferrer');
   };


  return (
    <html lang="en" className="dark">
      {/*
        Dynamically setting title in a Client Component Layout:
        React.useEffect(() => {
          document.title = 'CellConnect';
        }, []);
      */}
      <head>
         {/* Keep essential head elements like viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
         {/* Add title here for static title */}
        <title>CellConnect</title>
        <meta name="description" content="AI Network Simulation" />
         {/* Link fonts if needed */}
         {/* Favicon link removed to prevent potential build/chunking errors */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}> {/* Added relative positioning */}
        {/* Use the QueryProvider wrapper */}
        <QueryProvider>
            {/* Help Button */}
            <Button
              variant="default" // Use default blue color
              size="icon"
              className="fixed top-4 right-4 z-50 rounded-full shadow-lg" // Positioned top-right, always visible
              onClick={handleOpenHelp}
              title="Help - Learn about CellConnect"
            >
              <Info className="size-5" />
              <span className="sr-only">Help</span>
            </Button>

          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

