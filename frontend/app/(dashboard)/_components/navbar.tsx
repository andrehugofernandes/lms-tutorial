import React from 'react'
import MobileSidebar from './mobile-sidebar'
import { NavbarRoutes } from '@/components/navbar-routes'

const Navbar = () => {
  return (
    <div className="p-4 border-b border-border/50 h-full flex items-center
    bg-background/95 backdrop-blur-md">
      <MobileSidebar />
      <NavbarRoutes />
    </div>
  )
}

export default Navbar
