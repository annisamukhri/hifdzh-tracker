'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { ArrowLeft, Search, BookOpen } from 'lucide-react'
import { SURAHS, searchSurahs } from '@/lib/quran-data'
import type { Surah } from '@/lib/types'
import { DhikrDialog, getDhikrType } from '@/components/dhikr-dialog'

export default function PhysicalSessionSetup() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null)
  const [startAyah, setStartAyah] = useState('')
  const [endAyah, setEndAyah] = useState('')
  const [dhikrStep, setDhikrStep] = useState<'initial' | 'confirm' | null>(null)
  const [pendingNav, setPendingNav] = useState<string | null>(null)

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAHS.slice(0, 10)
    return searchSurahs(searchQuery)
  }, [searchQuery])

  function handleStartSession() {
    if (!selectedSurah || !startAyah || !endAyah) return
    const params = new URLSearchParams({
      surah: selectedSurah.number.toString(),
      start: startAyah,
      end: endAyah,
      mode: 'physical',
    })
    const url = `/session/active?${params.toString()}`
    setPendingNav(url)
    setDhikrStep('initial')
  }

  function handleDhikrYes() {
    const type = getDhikrType()
    if (type === 'istighfar') {
      router.push(pendingNav!)
    } else if (dhikrStep === 'initial') {
      router.push(pendingNav!)
    } else {
      setDhikrStep(null)
      setPendingNav(null)
    }
  }

  function handleDhikrNo() {
    if (dhikrStep === 'initial') {
      setDhikrStep('confirm')
    } else {
      router.push(pendingNav!)
    }
  }

  const isValid = selectedSurah &&
    startAyah &&
    endAyah &&
    parseInt(startAyah) >= 1 &&
    parseInt(endAyah) >= parseInt(startAyah) &&
    parseInt(endAyah) <= selectedSurah.numberOfAyahs

  return (
    <div className="min-h-screen bg-background">
      {dhikrStep && (
        <DhikrDialog
          type={getDhikrType()}
          step={dhikrStep}
          onYes={handleDhikrYes}
          onNo={handleDhikrNo}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">Physical Quran Session</h1>
            <p className="text-sm text-muted-foreground">Select your surah and ayah range</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Surah Search */}
        <div className="space-y-3">
          <FieldLabel>Search Surah</FieldLabel>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Surah List */}
          <div className="max-h-60 overflow-y-auto space-y-2 rounded-lg border p-2">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.number}
                onClick={() => {
                  setSelectedSurah(surah)
                  setStartAyah('1')
                  setEndAyah('')
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  selectedSurah?.number === surah.number
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  selectedSurah?.number === surah.number
                    ? 'bg-primary-foreground/20'
                    : 'bg-muted'
                }`}>
                  {surah.number}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{surah.englishName}</p>
                  <p className={`text-sm ${
                    selectedSurah?.number === surah.number
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}>
                    {surah.name} - {surah.numberOfAyahs} ayahs
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Surah Info */}
        {selectedSurah && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{selectedSurah.englishName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSurah.name} - {selectedSurah.numberOfAyahs} ayahs
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ayah Range */}
        {selectedSurah && (
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="startAyah">Start Ayah</FieldLabel>
                <Input
                  id="startAyah"
                  type="number"
                  min={1}
                  max={selectedSurah.numberOfAyahs}
                  value={startAyah}
                  onChange={(e) => setStartAyah(e.target.value)}
                  placeholder="1"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="endAyah">End Ayah</FieldLabel>
                <Input
                  id="endAyah"
                  type="number"
                  min={parseInt(startAyah) || 1}
                  max={selectedSurah.numberOfAyahs}
                  value={endAyah}
                  onChange={(e) => setEndAyah(e.target.value)}
                  placeholder={selectedSurah.numberOfAyahs.toString()}
                />
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">
              Max: {selectedSurah.numberOfAyahs} ayahs
            </p>
          </FieldGroup>
        )}

        {/* Start Button */}
        <Button
          onClick={handleStartSession}
          disabled={!isValid}
          className="w-full"
          size="lg"
        >
          Start Session
        </Button>
      </div>
    </div>
  )
}
