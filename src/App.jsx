import { useState, useCallback, useRef } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [outputText, setOutputText] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const fileInputRef = useRef(null)

  const parseCSV = useCallback((text) => {
    const lines = text.trim().split('\n')
    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const usernameIndex = header.findIndex(h => h === 'username')
    const displayNameIndex = header.findIndex(h => h === 'displayname' || h === 'display_name' || h === 'display name')

    if (usernameIndex === -1 || displayNameIndex === -1) {
      throw new Error('CSV must contain "username" and "displayName" columns')
    }

    // Parse data rows
    const data = []
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue

      // Handle quoted values with commas inside
      const values = parseCSVLine(lines[i])

      if (values.length > Math.max(usernameIndex, displayNameIndex)) {
        const username = values[usernameIndex].trim().replace(/"/g, '')
        const displayName = values[displayNameIndex].trim().replace(/"/g, '')

        if (username && displayName) {
          data.push({ username, displayName })
        }
      }
    }

    return data
  }, [])

  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  const formatOutput = useCallback((data) => {
    return data.map(row => `${row.username}@${row.displayName}`).join(',\n')
  }, [])

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file')
      return
    }

    setError('')
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const data = parseCSV(text)

        if (data.length === 0) {
          throw new Error('No valid data rows found in CSV')
        }

        setParsedData(data)
        setOutputText(formatOutput(data))
        setError('')
      } catch (err) {
        setError(err.message)
        setParsedData([])
        setOutputText('')
      }
    }
    reader.onerror = () => {
      setError('Error reading file')
    }
    reader.readAsText(selectedFile)
  }, [parseCSV, formatOutput])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files[0]
    handleFileSelect(selectedFile)
  }, [handleFileSelect])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setShowToast(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)

      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [outputText])

  const handleReset = useCallback(() => {
    setFile(null)
    setParsedData([])
    setOutputText('')
    setError('')
    setCopied(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <span className="header__icon">📄</span>
        <h1 className="header__title">CSV to Text Converter</h1>
        <p className="header__subtitle">
          Transform your CSV files with username & displayName columns into a clean, copy-pastable format
        </p>
      </header>

      {/* Main Card */}
      <main className="converter-card glass">
        {/* Upload Zone */}
        <div
          className={`upload-zone ${isDragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="upload-zone__icon">☁️</span>
          <p className="upload-zone__text">
            Drag & drop your CSV file here
          </p>
          <p className="upload-zone__hint">
            or click to browse • Supports .csv files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
          />
        </div>

        {/* Sample CSV Format Guide */}
        {!file && (
          <div className="sample-format">
            <div className="sample-format__header">
              <span className="sample-format__icon">📝</span>
              <span className="sample-format__title">Expected CSV Format</span>
            </div>
            <div className="sample-format__content">
              <code className="sample-format__code">
                <div className="sample-format__line sample-format__line--header">
                  <span className="sample-format__col">username</span>
                  <span className="sample-format__separator">,</span>
                  <span className="sample-format__col">displayName</span>
                </div>
                <div className="sample-format__line">
                  <span className="sample-format__col">john_doe</span>
                  <span className="sample-format__separator">,</span>
                  <span className="sample-format__col">John Doe</span>
                </div>
                <div className="sample-format__line">
                  <span className="sample-format__col">jane_smith</span>
                  <span className="sample-format__separator">,</span>
                  <span className="sample-format__col">Jane Smith</span>
                </div>
                <div className="sample-format__line sample-format__line--faded">
                  <span className="sample-format__col">...</span>
                  <span className="sample-format__separator">,</span>
                  <span className="sample-format__col">...</span>
                </div>
              </code>
            </div>
            <p className="sample-format__note">
              💡 Your CSV file must have <strong>username</strong> and <strong>displayName</strong> as column headers
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-message__icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* File Info */}
        {file && !error && (
          <div className="file-info">
            <span className="file-info__icon">📎</span>
            <div className="file-info__details">
              <p className="file-info__name">{file.name}</p>
              <p className="file-info__size">{formatFileSize(file.size)}</p>
            </div>
            <button className="file-info__remove" onClick={handleReset} title="Remove file">
              ✕
            </button>
          </div>
        )}

        {/* Stats */}
        {parsedData.length > 0 && (
          <div className="stats">
            <div className="stat">
              <div className="stat__value">{parsedData.length}</div>
              <div className="stat__label">Total Records</div>
            </div>
            <div className="stat">
              <div className="stat__value">{outputText.length}</div>
              <div className="stat__label">Characters</div>
            </div>
            <div className="stat">
              <div className="stat__value">{parsedData.length}</div>
              <div className="stat__label">Lines</div>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <div className="preview-section">
            <div className="preview-header">
              <span className="preview-header__title">📋 Data Preview</span>
            </div>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Display Name</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{row.username}</td>
                    <td>{row.displayName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 5 && (
              <div className="preview-more">
                ... and {parsedData.length - 5} more records
              </div>
            )}
          </div>
        )}

        {/* Output Section */}
        {outputText && (
          <div className="output-section">
            <div className="output-header">
              <span className="output-header__title">
                ✨ Formatted Output
              </span>
              <button
                className={`btn btn-primary copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <textarea
              className="output-textarea"
              value={outputText}
              readOnly
              placeholder="Formatted output will appear here..."
            />
            <div className="actions">
              <button className="btn btn-secondary" onClick={handleReset}>
                🔄 Start Over
              </button>
              <button className="btn btn-success" onClick={handleCopy}>
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!file && !error && (
          <div className="empty-state">
            <span className="empty-state__icon">📁</span>
            <p className="empty-state__text">
              Upload a CSV file to get started
            </p>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast">
          <span>✓</span>
          <span>Copied to clipboard!</span>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>CSV to Text Converter • Made by <a href='https://www.instagram.com/shameem_zsha/'>Shameem</a></p>
      </footer>
    </div>
  )
}

export default App
