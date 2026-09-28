import React, { Suspense } from 'react'
import UserNav from '@/components/UserNav'
import { getServerSession } from 'next-auth'
import { options } from '@/options'
import AdminUserNav from '@/components/AdminUserNav'
import TopNav from '@/components/TopNav'
import { redirect } from 'next/navigation'

async function Layout({ searchParams,children }: { searchParams: any, children: React.ReactNode }) {
  
  return (
    <div className="w-full">
      <div className="my-10 md:mx-auto px-6 md:px-0 w-full md:max-w-6xl flex flex-col md:flex-row gap-6 md:gap-x-4">
        {/* @ts-ignore */}
        <TopNav />
        <div className="p-4 print:p-0 rounded bg-slate-50/60 print:bg-transparent shadow print:shadow-none shadow-slate-300 flex-1">
          <Suspense key={searchParams} fallback={<div className="font-bold">Loading Main Page</div>}>
            { children }
          </Suspense>
        </div>
         
      </div>
    </div>
  );
}

export default Layout