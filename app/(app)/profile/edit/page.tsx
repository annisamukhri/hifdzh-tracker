'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Gender } from '@/lib/types'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function EditProfilePage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('full_name, age, gender').eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name ?? '')
        setAge(data.age != null ? String(data.age) : '')
        setGender(data.gender ?? '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      age: age ? parseInt(age) : null,
      gender: gender || null,
    }).eq('id', user.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Personal Info</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="age">Age <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
              <Input
                id="age"
                type="number"
                min={1}
                max={149}
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 25"
              />
            </Field>

            <Field>
              <FieldLabel>Gender <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(g => g === opt.value ? '' : opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                      gender === opt.value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
