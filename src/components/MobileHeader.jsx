import React from 'react'

export default function MobileHeader(){
  return (
    <header className="flex items-center justify-between mt-4 px-2">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <img src='/assets/avatar.png' alt='avatar' className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="text-xs text-gray-500">Hello!</div>
          <div className="font-semibold">John William</div>
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405C18.403 14.82 18 13.93 18 13V8a6 6 0 10-12 0v5c0 .93-.403 1.82-1.595 2.595L3 17h12z" /></svg>
      </div>
    </header>
  )
}
