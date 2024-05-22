'use client';

import Image from 'next/image'
import styles from './page.module.css'
import React from 'react'
import WorldMap from './components/WorldMap';
import AppTitle from './components/AppTitle';

export default function Home() {
  return (
    <main>
      <AppTitle />
      <WorldMap />
    </main>
  )
}