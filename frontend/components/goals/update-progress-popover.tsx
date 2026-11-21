'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TrendingUp } from 'lucide-react'
import { useState } from 'react'

interface UpdateProgressPopoverProps {
    current: number
    target: number
    onUpdate: (mode: 'increment' | 'set', value: number) => Promise<void> | void
    disabled?: boolean
}

export function UpdateProgressPopover({ current, target, onUpdate, disabled }: UpdateProgressPopoverProps) {
    const [open, setOpen] = useState(false)
    const [customValue, setCustomValue] = useState('')
    const [busy, setBusy] = useState(false)

    const handleIncrement = async (amount: number) => {
        setBusy(true)
        try {
            await onUpdate('increment', amount)
            setOpen(false)
        } finally {
            setBusy(false)
        }
    }

    const handleCustom = async () => {
        const val = Number(customValue)
        if (Number.isNaN(val) || val < 0) return
        setBusy(true)
        try {
            await onUpdate('set', val)
            setOpen(false)
            setCustomValue('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled} className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Update Progress
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
                <p className="text-sm font-medium text-[#1F2937] dark:text-white mb-3">
                    Current Progress: {current} / {target}
                </p>
                <div className="flex gap-2 mb-3">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => handleIncrement(1)} className="flex-1">
                        +1
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => handleIncrement(5)} className="flex-1">
                        +5
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={0}
                        placeholder="Custom value"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        className="h-8"
                    />
                    <Button size="sm" disabled={busy || customValue === ''} onClick={handleCustom}>
                        Set
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}