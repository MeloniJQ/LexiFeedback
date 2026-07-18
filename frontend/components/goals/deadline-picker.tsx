'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

interface DeadlinePickerProps {
    /** ISO date string (YYYY-MM-DD) or empty string */
    value: string
    onChange: (isoDate: string) => void
    error?: string
    disabled?: boolean
}

function formatDisplay(isoDate: string) {
    if (!isoDate) return ''
    const [y, m, d] = isoDate.split('-')
    if (!y || !m || !d) return ''
    return `${d}/${m}/${y}`
}

function toIsoDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function DeadlinePicker({ value, onChange, error, disabled }: DeadlinePickerProps) {
    const [open, setOpen] = useState(false)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !value && 'text-muted-foreground',
                            error && 'border-red-500 focus-visible:ring-red-500'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? formatDisplay(value) : 'DD/MM/YYYY'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            if (!date) return
                            onChange(toIsoDate(date))
                            setOpen(false)
                        }}
                        disabled={(date) => {
                            const d = new Date(date)
                            d.setHours(0, 0, 0, 0)
                            return d < today
                        }}
                        autoFocus
                    />
                </PopoverContent>
            </Popover>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    )
}