'use client'

import React from 'react'
import TopNavPill from './TopNavPill'
import { MdMail, MdPhone,MdOutlineWhatsapp } from 'react-icons/md'
import Socials from './Socials'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function TopNav() {
  const pathname = usePathname()

  const linkStyle = (href: string) =>
    pathname === href
      ? "flex items-center space-x-1 text-xs font-bold underline underline-offset-4 decoration-2"
      : "flex items-center space-x-1 text-xs font-medium hover:underline"

  return (
    <div className="w-full bg-[#153B50]">
      <div className="md:mx-auto px-4 w-full md:max-w-6xl h-8 md:h-14 flex flex-col md:flex-row items-center justify-center md:justify-between text-white">
        <div className="hidden md:flex flex-col md:flex-row md:space-x-12">
          <div className="text-xs font-medium">Transparency. Fairness. Integrity</div>
          <div className="flex items-center flex-col md:flex-row space-x-16">
            <Link href="/freshmen" className={linkStyle('/freshmen')}>
              Freshmen
            </Link>
            <Link href="/khn-hub" className={linkStyle('/khn-hub')}>
              KNH Hub
            </Link>
            <Link href="/e-market" className={linkStyle('/e-market')}>
              E-Market
            </Link>
            <Link href="/yellow-pages" className={linkStyle('/yellow-pages')}>
              Yellow Pages
            </Link>
            <TopNavPill title="+233 (0) 24 408 7163" Icon={MdOutlineWhatsapp} />
            <TopNavPill title="+233 (0) 55 910 0608" Icon={MdOutlineWhatsapp} />
          </div>
        </div>
        <div className="md:pr-8">
          <Socials />
        </div>
      </div>
    </div>
  );
}

export default TopNav