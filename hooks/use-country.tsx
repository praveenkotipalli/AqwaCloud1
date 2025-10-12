import { useState, useEffect } from 'react'

interface CountryData {
  country: string
  countryCode: string
  flag: string
}

export function useCountry() {
  const [countryData, setCountryData] = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try multiple IP geolocation services for better reliability
        const services = [
          'https://ipapi.co/json/',
          'https://ip-api.com/json/',
          'https://api.country.is/'
        ]

        for (const service of services) {
          try {
            const response = await fetch(service, { 
              timeout: 5000,
              headers: { 'Accept': 'application/json' }
            })
            
            if (response.ok) {
              const data = await response.json()
              
              let countryCode = ''
              let country = ''
              
              if (service.includes('ipapi.co')) {
                countryCode = data.country_code?.toLowerCase() || ''
                country = data.country_name || ''
              } else if (service.includes('ip-api.com')) {
                countryCode = data.countryCode?.toLowerCase() || ''
                country = data.country || ''
              } else if (service.includes('country.is')) {
                countryCode = data.country?.toLowerCase() || ''
                country = data.country || ''
              }

              if (countryCode && countryCode.length === 2) {
                const flag = getCountryFlag(countryCode)
                setCountryData({ country, countryCode, flag })
                break
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch from ${service}:`, error)
            continue
          }
        }
      } catch (error) {
        console.warn('Country detection failed:', error)
      } finally {
        setLoading(false)
      }
    }

    detectCountry()
  }, [])

  return { countryData, loading }
}

// Function to get country flag emoji from country code
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  
  return String.fromCodePoint(...codePoints)
}
