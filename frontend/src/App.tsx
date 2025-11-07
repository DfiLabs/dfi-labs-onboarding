import React, { useMemo, useState, useEffect } from 'react'
import './styles.css'
import { presign, submit } from './api'
import { getInviteToken } from './invite'

const COUNTRIES = [
  // A
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  // B
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  // C
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  // D
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  // E
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  // F
  'Fiji', 'Finland', 'France',
  // G
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  // H
  'Haiti', 'Honduras', 'Hungary',
  // I
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
  // J
  'Jamaica', 'Japan', 'Jordan',
  // K
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  // L
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  // M
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  // N
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  // O
  'Oman',
  // P
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  // Q
  'Qatar',
  // R
  'Romania', 'Russia', 'Rwanda',
  // S
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  // T
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  // U
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  // V
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  // Y
  'Yemen',
  // Z
  'Zambia', 'Zimbabwe'
]

const CATEGORIES_INDIV = [
  {key:'id', label:'Government photo ID'},
  {key:'proof_address', label:'Proof of address (≤3 months)'},
  {key:'tax', label:'Tax residency & TIN (CRS/FATCA)'},
  {key:'pep', label:'PEP declaration'},
  {key:'source_wealth', label:'Source of funds/wealth statement'},
  {key:'wallets', label:'Intended wallet addresses / exchange accounts (optional)'},
]

const CATEGORIES_ENTITY = [
  {key:'incorp', label:'Certificate of incorporation / K-bis'},
  {key:'articles', label:'Articles / statutes'},
  {key:'directors', label:'Register of directors & shareholders/UBOs'},
  {key:'board_resolution', label:'Board resolution / authorization'},
  {key:'ubo_ids', label:'UBOs ID + proof of address'},
  {key:'tax_class', label:'Tax classification (CRS/FATCA)'},
  {key:'aml', label:'AML policy or license (if applicable)'},
  {key:'lei', label:'LEI (optional)'},
]

export default function App(){
  const [type, setType] = useState<'individual'|'entity'>('individual')
  const [country, setCountry] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false)
  const [taxResidencySearch, setTaxResidencySearch] = useState('')
  const [showTaxResidencyDropdown, setShowTaxResidencyDropdown] = useState(false)
  const [addressSearch, setAddressSearch] = useState('')
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [status, setStatus] = useState<'idle'|'uploading'|'done'|'error'>('idle')
  const [msg, setMsg] = useState('')

  // Universal fields
  const [fullLegalName, setFullLegalName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [taxResidencyCountry, setTaxResidencyCountry] = useState('')
  const [tin, setTin] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [pepStatus, setPepStatus] = useState<'yes'|'no'>('no')
  const [pepDetails, setPepDetails] = useState('')
  const [subscriptionBand, setSubscriptionBand] = useState('')
  const [subscriptionCurrency, setSubscriptionCurrency] = useState('')

  // Individual only fields
  const [nationality, setNationality] = useState('')

  // Entity only fields
  const [registeredLegalName, setRegisteredLegalName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [uboList, setUboList] = useState('')
  const [ubos, setUbos] = useState<Array<{name: string, dob: string, control: string}>>([{name: '', dob: '', control: ''}])
  const [authorizedSignatoryName, setAuthorizedSignatoryName] = useState('')
  const [authorizedSignatoryTitle, setAuthorizedSignatoryTitle] = useState('')
  const [lei, setLei] = useState('')

  // OPEN MODE: token is optional
  const token = getInviteToken() || ''
  const cats = useMemo(()=> type==='individual'? CATEGORIES_INDIV : CATEGORIES_ENTITY, [type])
  
  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES.slice(0, 15) // Show first 15 by default
    
    const searchTerm = countrySearch.toLowerCase().trim()
    return COUNTRIES.filter(country => {
      const countryLower = country.toLowerCase()
      // Check if search term matches the beginning of the country name or any word in it
      return countryLower.startsWith(searchTerm) || 
             countryLower.includes(searchTerm) ||
             country.split(' ').some(word => word.toLowerCase().startsWith(searchTerm))
    }).slice(0, 25) // Limit to 25 results for better UX
  }, [countrySearch])

  const filteredNationalities = useMemo(() => {
    if (!nationalitySearch.trim()) return COUNTRIES.slice(0, 15) // Show first 15 by default
    
    const searchTerm = nationalitySearch.toLowerCase().trim()
    return COUNTRIES.filter(nationality => {
      const nationalityLower = nationality.toLowerCase()
      // Check if search term matches the beginning of the nationality name or any word in it
      return nationalityLower.startsWith(searchTerm) || 
             nationalityLower.includes(searchTerm) ||
             nationality.split(' ').some(word => word.toLowerCase().startsWith(searchTerm))
    }).slice(0, 25) // Limit to 25 results for better UX
  }, [nationalitySearch])

  const filteredTaxResidencyCountries = useMemo(() => {
    if (!taxResidencySearch.trim()) return COUNTRIES.slice(0, 15) // Show first 15 by default
    
    const searchTerm = taxResidencySearch.toLowerCase().trim()
    return COUNTRIES.filter(country => {
      const countryLower = country.toLowerCase()
      // Check if search term matches the beginning of the country name or any word in it
      return countryLower.startsWith(searchTerm) || 
             countryLower.includes(searchTerm) ||
             country.split(' ').some(word => word.toLowerCase().startsWith(searchTerm))
    }).slice(0, 25) // Limit to 25 results for better UX
  }, [taxResidencySearch])
  
  const handleCountrySelect = (selectedCountry: string) => {
    setCountry(selectedCountry)
    setCountrySearch(selectedCountry)
    setShowCountryDropdown(false)
  }

  const handleNationalitySelect = (selectedNationality: string) => {
    setNationality(selectedNationality)
    setNationalitySearch(selectedNationality)
    setShowNationalityDropdown(false)
  }

  const handleTaxResidencySelect = (selectedCountry: string) => {
    setTaxResidencyCountry(selectedCountry)
    setTaxResidencySearch(selectedCountry)
    setShowTaxResidencyDropdown(false)
  }

  // Address search functionality
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      return
    }

    setIsSearchingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&countrycodes=&accept-language=en`
      )
      const data = await response.json()
      setAddressSuggestions(data)
    } catch (error) {
      console.error('Address search error:', error)
      setAddressSuggestions([])
    } finally {
      setIsSearchingAddress(false)
    }
  }

  const handleAddressSelect = (address: any) => {
    const displayName = address.display_name
    setFullAddress(displayName)
    setAddressSearch(displayName)
    setShowAddressDropdown(false)
    setAddressSuggestions([])
  }

  const formatAddressSuggestion = (address: any) => {
    const parts: string[] = []
    if (address.address?.house_number) parts.push(address.address.house_number)
    if (address.address?.road) parts.push(address.address.road)
    if (address.address?.suburb) parts.push(address.address.suburb)
    if (address.address?.city || address.address?.town || address.address?.village) {
      parts.push(address.address.city || address.address.town || address.address.village)
    }
    if (address.address?.postcode) parts.push(address.address.postcode)
    if (address.address?.country) parts.push(address.address.country)
    
    return parts.join(', ') || address.display_name
  }

  // UBO management functions
  const addUbo = () => {
    setUbos([...ubos, {name: '', dob: '', control: ''}])
  }

  const removeUbo = (index: number) => {
    if (ubos.length > 1) {
      setUbos(ubos.filter((_, i) => i !== index))
    }
  }

  const updateUbo = (index: number, field: 'name' | 'dob' | 'control', value: string) => {
    const updatedUbos = [...ubos]
    updatedUbos[index][field] = value
    setUbos(updatedUbos)
  }

  // Debounced address search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressSearch && addressSearch.length >= 3) {
        searchAddresses(addressSearch)
      }
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [addressSearch])

  function onPick(category: string, picked: FileList | null){
    if(!picked || picked.length===0) return
    setFiles(prev => {
      const existing = prev[category] || []
      const incoming = Array.from(picked)
      const keyOf = (f: File) => `${f.name}-${f.size}-${(f as any).lastModified ?? ''}`
      const seen = new Set(existing.map(keyOf))
      const combined: File[] = [...existing]
      for(const f of incoming){
        const k = keyOf(f)
        if(!seen.has(k)){
          combined.push(f)
          seen.add(k)
        }
      }
      return { ...prev, [category]: combined }
    })
  }

  function removeFile(category: string, index: number){
    setFiles(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter((_, i) => i !== index)
    }))
  }

  // Deprecated duplicate UBO helpers removed (using addUbo/removeUbo/updateUbo above)

  function formatUBOList() {
    return ubos.filter(ubo => ubo.name.trim() && ubo.dob && ubo.control).map(ubo => `${ubo.name} | ${ubo.dob} | ${ubo.control}`).join('\n')
  }

  async function onSubmit(){
    try{
      // Validation
      if(!email) { setStatus('error'); setMsg('Please enter your email.'); return }
      if(!fullLegalName) { setStatus('error'); setMsg('Please enter your full legal name.'); return }
      if(!dateOfBirth) { setStatus('error'); setMsg('Please enter your date of birth/incorporation.'); return }
      if(!fullAddress) { setStatus('error'); setMsg('Please enter your full address.'); return }
      if(!taxResidencyCountry) { setStatus('error'); setMsg('Please enter your tax residency country.'); return }
      if(!tin) { setStatus('error'); setMsg('Please enter your TIN (Tax Identification Number).'); return }
      if(!mobileNumber) { setStatus('error'); setMsg('Please enter your mobile number.'); return }
      if(!subscriptionBand) { setStatus('error'); setMsg('Please select your expected subscription band.'); return }
      if(!subscriptionCurrency) { setStatus('error'); setMsg('Please select your subscription currency.'); return }
      if(!country) { setStatus('error'); setMsg('Please enter your country of residence/incorporation.'); return }
      
      if(type === 'individual' && !nationality) { 
        setStatus('error'); setMsg('Please enter your nationality.'); return 
      }
      
      if(type === 'entity') {
        if(!registrationNumber) { setStatus('error'); setMsg('Please enter your registration number.'); return }
        if(ubos.length === 0) { setStatus('error'); setMsg('Please add at least one UBO.'); return }
        if(ubos.some(ubo => !ubo.name || !ubo.dob || !ubo.control)) { 
          setStatus('error'); setMsg('Please complete all UBO information (name, date of birth, and % control).'); return 
        }
        if(!authorizedSignatoryName) { setStatus('error'); setMsg('Please enter authorized signatory name.'); return }
        if(!authorizedSignatoryTitle) { setStatus('error'); setMsg('Please enter authorized signatory title.'); return }
      }

      setStatus('uploading'); setMsg('Processing submission…')

      // Skip file uploads for now to test the core functionality
      const uploaded: any[] = []
      // for(const [category, list] of Object.entries(files)){
      //   for(const f of list){
      //     const { url, key } = await presign(f, category, token || undefined)
      //     const put = await fetch(url, { method:'PUT', headers:{'Content-Type': f.type}, body:f })
      //     if(!put.ok) throw new Error(`Upload failed for ${f.name}`)
      //     uploaded.push({ key, filename: f.name, category, sizeBytes: f.size, contentType: f.type })
      //   }
      // }

      setMsg('Finalizing submission…')
      const payload: any = {
        email,
        clientType: type,
        country,
        files: uploaded,
        userAgent: navigator.userAgent,
        // Universal fields
        fullLegalName,
        dateOfBirth,
        fullAddress,
        taxResidencyCountry,
        tin,
        mobileNumber,
        pepStatus,
        pepDetails: pepStatus === 'yes' ? pepDetails : '',
        subscriptionBand,
        subscriptionCurrency,
        // Individual fields
        ...(type === 'individual' && { nationality }),
        // Entity fields
        ...(type === 'entity' && {
          registeredLegalName: registeredLegalName || fullLegalName,
          registrationNumber,
          uboList: formatUBOList(),
          authorizedSignatoryName,
          authorizedSignatoryTitle,
          lei
        })
      }
      if (token) payload.inviteToken = token   // optional

      await submit(payload)
      setStatus('done'); setMsg('Submitted. We’ll be in touch soon.')
    }catch(err:any){
      setStatus('error'); setMsg(err?.message || 'Submission failed')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>DFI Labs — Secure Onboarding</h1>
        <p className="muted">Please provide your details and upload the required documents.</p>

        <div className="step">
          <label>Contact email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div className="step">
          <label>Client type</label>
          <div className="radio-row">
            <label><input type="radio" name="type" checked={type==='individual'} onChange={()=>setType('individual')} /> Individual</label>
            <label><input type="radio" name="type" checked={type==='entity'} onChange={()=>setType('entity')} /> Entity</label>
          </div>
        </div>

        <h3>Universal Information</h3>
        
        <div className="step">
          <label>Full legal name (exact, as on ID/registry)</label>
          <input type="text" placeholder="Full legal name" value={fullLegalName} onChange={e=>setFullLegalName(e.target.value)} />
        </div>

        <div className="step">
          <label>Date of birth / incorporation (YYYY-MM-DD)</label>
          <input type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} />
        </div>

        <div className="step">
          <label>Full address (street, postcode, city, country)</label>
          <div className="country-dropdown">
            <input 
              type="text" 
              placeholder="Type to search addresses worldwide (e.g., '123 Main St, Paris' or 'Champs-Élysées, France')..." 
              value={addressSearch} 
              onChange={e => {
                setAddressSearch(e.target.value)
                setShowAddressDropdown(true)
              }}
              onFocus={() => setShowAddressDropdown(true)}
              onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
              autoComplete="off"
            />
            {showAddressDropdown && (
              <div className="country-dropdown-list">
                {isSearchingAddress && (
                  <div className="country-option no-results">Searching addresses...</div>
                )}
                {!isSearchingAddress && addressSuggestions.length === 0 && addressSearch.length >= 3 && (
                  <div className="country-option no-results">No addresses found</div>
                )}
                {!isSearchingAddress && addressSearch.length < 3 && (
                  <div className="country-option no-results">Type at least 3 characters to search</div>
                )}
                {!isSearchingAddress && addressSuggestions.map((address, index) => (
                  <div 
                    key={index}
                    className="country-option"
                    onClick={() => handleAddressSelect(address)}
                  >
                    <div style={{fontWeight: '500'}}>{formatAddressSuggestion(address)}</div>
                    <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                      {address.address?.country || 'Unknown Country'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="step">
          <label>Tax residency country</label>
          <div className="country-dropdown">
            <input 
              type="text" 
              placeholder="Type to search countries (e.g., 'France', 'United States')..." 
              value={taxResidencySearch} 
              onChange={e => {
                setTaxResidencySearch(e.target.value)
                setShowTaxResidencyDropdown(true)
              }}
              onFocus={() => setShowTaxResidencyDropdown(true)}
              onBlur={() => setTimeout(() => setShowTaxResidencyDropdown(false), 200)}
              autoComplete="off"
            />
            {showTaxResidencyDropdown && (
              <div className="country-dropdown-list">
                {filteredTaxResidencyCountries.map(countryName => (
                  <div 
                    key={countryName}
                    className="country-option"
                    onClick={() => handleTaxResidencySelect(countryName)}
                  >
                    {countryName}
                  </div>
                ))}
                {filteredTaxResidencyCountries.length === 0 && (
                  <div className="country-option no-results">No countries found</div>
                )}
                {filteredTaxResidencyCountries.length > 0 && (
                  <div className="country-option no-results" style={{fontSize: '12px', color: '#666'}}>
                    Showing {filteredTaxResidencyCountries.length} of {COUNTRIES.length} countries
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="step">
          <label>TIN (Tax Identification Number)</label>
          <input type="text" placeholder="Tax identification number" value={tin} onChange={e=>setTin(e.target.value)} />
        </div>

        <div className="step">
          <label>Mobile number</label>
          <input type="tel" placeholder="+33 6 12 34 56 78" value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} />
        </div>

        <div className="step">
          <label>PEP status (Politically Exposed Person)</label>
          <div className="radio-row">
            <label><input type="radio" name="pep" checked={pepStatus==='no'} onChange={()=>setPepStatus('no')} /> No</label>
            <label><input type="radio" name="pep" checked={pepStatus==='yes'} onChange={()=>setPepStatus('yes')} /> Yes</label>
          </div>
          {pepStatus === 'yes' && (
            <div style={{marginTop: 8}}>
              <input 
                type="text" 
                placeholder="Role/country details" 
                value={pepDetails} 
                onChange={e=>setPepDetails(e.target.value)} 
              />
            </div>
          )}
        </div>

        <div className="step">
          <label>Expected subscription band</label>
          <select value={subscriptionBand} onChange={e=>setSubscriptionBand(e.target.value)}>
            <option value="">Select subscription band</option>
            <option value="€0-€50k">€0-€50k</option>
            <option value="€50k-€100k">€50k-€100k</option>
            <option value="€100k-€250k">€100k-€250k</option>
            <option value="€250k-€500k">€250k-€500k</option>
            <option value="€500k-€1M">€500k-€1M</option>
            <option value="€1M-€5M">€1M-€5M</option>
            <option value="€5M+">€5M+</option>
            <option value="$0-$50k">$0-$50k</option>
            <option value="$50k-$100k">$50k-$100k</option>
            <option value="$100k-$250k">$100k-$250k</option>
            <option value="$250k-$500k">$250k-$500k</option>
            <option value="$500k-$1M">$500k-$1M</option>
            <option value="$1M-$5M">$1M-$5M</option>
            <option value="$5M+">$5M+</option>
          </select>
        </div>

        <div className="step">
          <label>Subscription currency</label>
          <select value={subscriptionCurrency} onChange={e=>setSubscriptionCurrency(e.target.value)}>
            <option value="">Select currency</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="GBP">GBP (British Pound)</option>
            <option value="CHF">CHF (Swiss Franc)</option>
            <option value="CAD">CAD (Canadian Dollar)</option>
            <option value="AUD">AUD (Australian Dollar)</option>
            <option value="JPY">JPY (Japanese Yen)</option>
          </select>
        </div>

        {type === 'individual' && (
          <>
            <h3>Individual Information</h3>
            <div className="step">
              <label>Nationality</label>
              <div className="country-dropdown">
                <input 
                  type="text" 
                  placeholder="Type to search nationalities (e.g., 'French', 'American')..." 
                  value={nationalitySearch} 
                  onChange={e => {
                    setNationalitySearch(e.target.value)
                    setShowNationalityDropdown(true)
                  }}
                  onFocus={() => setShowNationalityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowNationalityDropdown(false), 200)}
                  autoComplete="off"
                />
                {showNationalityDropdown && (
                  <div className="country-dropdown-list">
                    {filteredNationalities.map(nationalityName => (
                      <div 
                        key={nationalityName}
                        className="country-option"
                        onClick={() => handleNationalitySelect(nationalityName)}
                      >
                        {nationalityName}
                      </div>
                    ))}
                    {filteredNationalities.length === 0 && (
                      <div className="country-option no-results">No nationalities found</div>
                    )}
                    {filteredNationalities.length > 0 && (
                      <div className="country-option no-results" style={{fontSize: '12px', color: '#666'}}>
                        Showing {filteredNationalities.length} of {COUNTRIES.length} nationalities
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {type === 'entity' && (
          <>
            <h3>Entity Information</h3>
            <div className="step">
              <label>Registered legal name (if different from contact)</label>
              <input type="text" placeholder="Leave blank if same as full legal name" value={registeredLegalName} onChange={e=>setRegisteredLegalName(e.target.value)} />
            </div>

            <div className="step">
              <label>Registration number (e.g., SIREN/SIRET in FR)</label>
              <input type="text" placeholder="Registration number" value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value)} />
            </div>

            <div className="step">
              <label>UBO list (Ultimate Beneficial Owners)</label>
              <small style={{color: '#666', fontSize: '12px', display: 'block', marginBottom: '10px'}}>
                Include all individuals with 25% or more ownership/control
              </small>
              
              {ubos.map((ubo, index) => (
                <div key={index} style={{border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: 'var(--input-bg)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h4 style={{margin: 0, fontSize: '14px', color: 'var(--fg)'}}>UBO #{index + 1}</h4>
                    {ubos.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeUbo(index)}
                        style={{
                          background: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                    <div>
                      <label style={{fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px'}}>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={ubo.name} 
                        onChange={e => updateUbo(index, 'name', e.target.value)}
                        style={{width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--card-bg)', color: 'var(--fg)'}}
                      />
                    </div>
                    
                    <div>
                      <label style={{fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px'}}>Date of Birth</label>
                      <input 
                        type="date" 
                        value={ubo.dob} 
                        onChange={e => updateUbo(index, 'dob', e.target.value)}
                        style={{width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--card-bg)', color: 'var(--fg)'}}
                      />
                    </div>
                    
                    <div>
                      <label style={{fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px'}}>% Control</label>
                      <input 
                        type="text" 
                        placeholder="25%" 
                        value={ubo.control} 
                        onChange={e => updateUbo(index, 'control', e.target.value)}
                        style={{width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--card-bg)', color: 'var(--fg)'}}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={addUbo}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                + Add Another UBO
              </button>
            </div>

            <div className="step">
              <label>Authorized signatory name</label>
              <input type="text" placeholder="Signatory name" value={authorizedSignatoryName} onChange={e=>setAuthorizedSignatoryName(e.target.value)} />
            </div>

            <div className="step">
              <label>Authorized signatory title</label>
              <input type="text" placeholder="e.g., CEO, Managing Director" value={authorizedSignatoryTitle} onChange={e=>setAuthorizedSignatoryTitle(e.target.value)} />
            </div>

            <div className="step">
              <label>LEI (Legal Entity Identifier) - Optional</label>
              <input type="text" placeholder="20-character LEI code" value={lei} onChange={e=>setLei(e.target.value)} />
            </div>
          </>
        )}

        <div className="step">
          <label>Country of residence / incorporation</label>
          <div className="country-dropdown">
            <input 
              type="text" 
              placeholder="Type to search countries (e.g., 'France', 'United States')..." 
              value={countrySearch} 
              onChange={e => {
                setCountrySearch(e.target.value)
                setShowCountryDropdown(true)
              }}
              onFocus={() => setShowCountryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
              autoComplete="off"
            />
            {showCountryDropdown && (
              <div className="country-dropdown-list">
                {filteredCountries.map(countryName => (
                  <div 
                    key={countryName}
                    className="country-option"
                    onClick={() => handleCountrySelect(countryName)}
                  >
                    {countryName}
                  </div>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="country-option no-results">No countries found</div>
                )}
                {filteredCountries.length > 0 && (
                  <div className="country-option no-results" style={{fontSize: '12px', color: '#666'}}>
                    Showing {filteredCountries.length} of {COUNTRIES.length} countries
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="step">
          <label>Uploads</label>
          {cats.map(c=> (
            <div key={c.key} style={{marginBottom:12}}>
              <div className="uploader">
                <div>
                  <strong>
                    {c.label}
                    {files[c.key]?.length ? ` — ${files[c.key].length} file${files[c.key].length>1?'s':''}` : ''}
                  </strong>
                </div>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e=>onPick(c.key, e.target.files)} />
              </div>
              <div className="filelist">
                {(files[c.key]||[]).map((f, idx) => (
                  <div key={`${f.name}-${idx}`} style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
                    <div>• {f.name} ({Math.ceil(f.size/1024)} KB)</div>
                    <button type="button" className="btn secondary" style={{padding:'4px 8px', fontSize:12}} onClick={() => removeFile(c.key, idx)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr />
        <div className="step">
          <button className="btn" onClick={onSubmit} disabled={status==='uploading'}>Submit dossier</button>
          {status==='uploading' && <p className="muted">{msg}</p>}
          {status==='done' && <p className="success">{msg}</p>}
          {status==='error' && <p className="error">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
