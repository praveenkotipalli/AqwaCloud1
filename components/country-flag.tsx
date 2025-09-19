import { useCountry } from '@/hooks/use-country'
import { Globe } from 'lucide-react'

interface CountryFlagProps {
  className?: string
  showText?: boolean
}

export function CountryFlag({ className = '', showText = false }: CountryFlagProps) {
  const { countryData, loading } = useCountry()

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Globe className="h-4 w-4 animate-pulse text-muted-foreground" />
        {showText && <span className="text-xs text-muted-foreground">Detecting...</span>}
      </div>
    )
  }

  if (!countryData) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        {showText && <span className="text-xs text-muted-foreground">Unknown</span>}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-lg" title={`${countryData.country} (${countryData.countryCode.toUpperCase()})`}>
        {countryData.flag}
      </span>
      {showText && (
        <span className="text-xs text-muted-foreground" title={countryData.country}>
          {countryData.countryCode.toUpperCase()}
        </span>
      )}
    </div>
  )
}
