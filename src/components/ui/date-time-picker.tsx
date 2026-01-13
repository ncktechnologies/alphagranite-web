"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarDays, CalendarIcon, Clock3, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DateTimePickerProps {
  value?: Date
  onChange: (value: Date | undefined) => void
  mode: "date" | "datetime"
  label?: string
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  timeSlots?: string[]
  disabledTime?: (time: string) => boolean
}

interface TimePickerProps {
  value?: Date
  onChange: (value: Date | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

const generateTimeSlots = (interval = 30): string[] => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
    }
  }
  return slots
}

// Enhanced Calendar with Year/Month Navigation
interface EnhancedCalendarProps {
  mode: "single"
  selected?: Date
  onSelect: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

function EnhancedCalendar({ mode, selected, onSelect, disabled, className }: EnhancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date())
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false)

  const currentYear = currentMonth.getFullYear()
  const currentMonthIndex = currentMonth.getMonth()

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Generate year options (current year ± 50 years)
  const yearOptions = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i)

  const handleMonthYearChange = (year: number, month: number) => {
    const newDate = new Date(year, month, 1)
    setCurrentMonth(newDate)
    setShowYearMonthPicker(false)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth)
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  if (showYearMonthPicker) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Select Month & Year</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowYearMonthPicker(false)}>
            Back
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select
              value={currentYear.toString()}
              onValueChange={(value) => handleMonthYearChange(Number.parseInt(value), currentMonthIndex)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Month</Label>
            <Select
              value={currentMonthIndex.toString()}
              onValueChange={(value) => handleMonthYearChange(currentYear, Number.parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Custom Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Month/year display with subtle indicator for year/month selection */}
        <div 
          className="font-medium cursor-pointer hover:bg-accent rounded-md px-2 py-1 flex items-center"
          onClick={() => setShowYearMonthPicker(true)}
        >
          {format(currentMonth, "MMMM yyyy")}
          <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Component - Hide default month caption */}
      <Calendar
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        disabled={disabled}
        className="p-0"
        classNames={{
          month_caption: 'hidden', // Hide the default month caption
        }}
      />
    </div>
  )
}

const DateTimePicker = ({
  value,
  onChange,
  mode,
  label,
  placeholder,
  disabled = false,
  minDate,
  maxDate,
  timeSlots = generateTimeSlots(),
  disabledTime,
}: DateTimePickerProps) => {
  const [dateValue, setDateValue] = useState<Date | undefined>(value)
  const [timeValue, setTimeValue] = useState<string | undefined>(value ? format(value, "HH:mm") : undefined)
  const [isOpen, setIsOpen] = useState(false) // Add state to control popover

  // Sync with external value changes
  useEffect(() => {
    setDateValue(value)
    setTimeValue(value ? format(value, "HH:mm") : undefined)
  }, [value])

  // Combine date and time when both are selected
  useEffect(() => {
    if (dateValue && timeValue && mode === "datetime") {
      const [hours, minutes] = timeValue.split(":").map(Number)
      const newDate = new Date(dateValue)
      newDate.setHours(hours, minutes, 0, 0)
      // Only call onChange if the new date is different from the current value
      if (!value || newDate.getTime() !== value.getTime()) {
        onChange(newDate)
      }
    } else if (dateValue && mode === "date") {
      // Only call onChange if the date is different from the current value
      if (!value || dateValue.getTime() !== value.getTime()) {
        onChange(dateValue)
      }
    }
  }, [dateValue, timeValue, onChange, mode, value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Create a new date object to avoid timezone issues
      const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setDateValue(selectedDate);
    } else {
      setDateValue(date);
    }
    // Reset time when date changes in datetime mode
    if (mode === "datetime" && !timeValue) {
      setTimeValue(undefined)
    }
    // Close the popover when a date is selected
    if (date) {
      setIsOpen(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    setTimeValue(time)
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className="w-full">
      {label && <Label className="flex w-full items-center gap-1 mb-2.5">{label}</Label>}

      {mode === "date" ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground")}
              disabled={disabled}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, "PPP") : placeholder || "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <EnhancedCalendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
            />
          </PopoverContent>
        </Popover>
      ) : mode === "datetime" ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground")}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue
                ? `${format(dateValue, "PPP")}${timeValue ? ` at ${timeValue}` : ""}`
                : placeholder || "Pick a date and time"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex max-sm:flex-col">
              <EnhancedCalendar
                mode="single"
                selected={dateValue}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="p-2 sm:pe-5"
              />
              <div className="relative w-full max-sm:h-48 sm:w-40">
                <div className="absolute inset-0 py-4 max-sm:border-t">
                  <ScrollArea className="h-full sm:border-s">
                    <div className="space-y-3">
                      <div className="flex h-5 shrink-0 items-center px-5">
                        <p className="text-sm font-medium">
                          {dateValue ? format(dateValue, "EEEE, d") : "Pick a date"}
                        </p>
                      </div>
                      <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                        {timeSlots.map((timeSlot) => (
                          <Button
                            type="button"
                            key={timeSlot}
                            variant={timeValue === timeSlot ? "primary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => handleTimeSelect(timeSlot)}
                            disabled={disabledTime ? disabledTime(timeSlot) : false}
                          >
                            {timeSlot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

const TimePicker = ({ value, onChange, label, placeholder = "Select time", disabled = false }: TimePickerProps) => {
  const [timeValue, setTimeValue] = useState<string>(value ? format(value, "HH:mm") : "")

  useEffect(() => {
    setTimeValue(value ? format(value, "HH:mm") : "")
  }, [value])

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setTimeValue(newTime)

    if (newTime) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const now = value || new Date()
      const newDate = new Date(now)
      newDate.setHours(hours, minutes, 0, 0)
      onChange(newDate)
    } else {
      onChange(undefined)
    }
  }

  return (
    <div className="w-full">
      {label && <Label className="flex w-full items-center gap-1 mb-2.5">{label}</Label>}
      <div className="relative">
        <Clock3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
    </div>
  )
}

export { DateTimePicker, TimePicker }
