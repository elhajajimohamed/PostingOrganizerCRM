'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, AlertCircle, ExternalLink, Play, Pause, Square } from 'lucide-react';

interface LeadGenerationResult {
  success: boolean;
  message?: string;
  jobId?: string;
  data?: {
    jobId: string;
    keyword: string;
    source: string;
    status: string;
  };
  error?: string;
}

interface ScrapedBusiness {
  name: string;
  website: string;
  phones: string[];
  emails: string[];
  address: string;
  snippet: string;
}

export function LeadGenerationForm() {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResults, setScrapedResults] = useState<ScrapedBusiness[]>([]);
  const [currentStep, setCurrentStep] = useState<'idle' | 'opening' | 'searching' | 'extracting' | 'saving'>('idle');
  const [result, setResult] = useState<LeadGenerationResult | null>(null);
  const [recentActivities, setRecentActivities] = useState<LeadGenerationResult[]>([]);
  const googleWindowRef = useRef<Window | null>(null);

  const openGoogleAndScrape = async () => {
    if (!keyword.trim()) {
      setResult({
        success: false,
        error: 'Please enter a keyword'
      });
      return;
    }

    setIsLoading(true);
    setIsScraping(true);
    setCurrentStep('opening');
    setScrapedResults([]);

    try {
      console.log('🚀 Starting browser-based lead generation for keyword:', keyword);

      // Open Google in a new window
      const googleWindow = window.open(
        'https://www.google.com',
        'google_scraper',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );

      if (!googleWindow) {
        throw new Error('Failed to open Google window. Please allow popups for this site.');
      }

      googleWindowRef.current = googleWindow;

      // Wait for Google to load
      setCurrentStep('searching');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if window is still open
      if (googleWindow.closed) {
        throw new Error('Google window was closed by user');
      }

      // Try to inject search script
    try {
      const searchScript = `
        (function() {
          // Wait for search box to be available
          function waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
                return;
              }

              const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                  observer.disconnect();
                  resolve(element);
                }
              });

              observer.observe(document.body, {
                childList: true,
                subtree: true
              });

              setTimeout(() => {
                observer.disconnect();
                reject(new Error('Element not found: ' + selector));
              }, timeout);
            });
          }

          // Main scraping function
          async function performSearch() {
            try {
              console.log('🔍 Starting automated search...');

              // Wait for search box
              const searchBox = await waitForElement('input[name="q"]', 15000);
              console.log('✅ Found search box');

              // Clear and type search term
              searchBox.value = '';
              searchBox.focus();

              // Type the search term with human-like delays
              const searchTerm = '${keyword} centre d\\'appel OR call center OR telemarketing OR BPO';
              for (let i = 0; i < searchTerm.length; i++) {
                searchBox.value += searchTerm[i];
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
              }

              // Press Enter
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              });
              searchBox.dispatchEvent(enterEvent);

              console.log('✅ Search submitted');

              // Wait for results to load
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Extract results
              const results = extractResults();
              console.log('📊 Extracted results:', results);

              // Send results back to parent window
              window.parent.postMessage({
                type: 'SCRAPING_RESULTS',
                results: results,
                keyword: '${keyword}'
              }, '*');

            } catch (error) {
              console.error('❌ Search error:', error);
              window.parent.postMessage({
                type: 'SCRAPING_ERROR',
                error: error.message
              }, '*');
            }
          }

          function extractResults() {
            const results = [];

            // Try multiple selectors for search results
            const resultSelectors = [
              '.g',
              '[data-ved]',
              '.result',
              '.Gx5Zad'
            ];

            for (const selector of resultSelectors) {
              document.querySelectorAll(selector).forEach((element, index) => {
                if (results.length >= 10) return; // Limit results

                try {
                  // Extract title
                  const titleElement = element.querySelector('h3, .LC20lb, a');
                  const title = titleElement?.textContent?.trim();

                  if (!title || title.length < 3) return;

                  // Extract URL
                  const linkElement = element.querySelector('a[href]');
                  let url = linkElement?.getAttribute('href') || '';

                  // Clean Google URLs
                  if (url.startsWith('/url?q=')) {
                    const urlObj = new URL(url, 'https://www.google.com');
                    url = urlObj.searchParams.get('q') || url;
                  }

                  // Extract snippet
                  const snippetElement = element.querySelector('.VwiC3b, .s3v9rd, .IsZvec, span:not([class])');
                  const snippet = snippetElement?.textContent?.trim() || '';

                  // Extract phone numbers
                  const phoneRegex = /(\\+\\d{1,3}[-\\.\\s]?)?\\(?(\\d{3})\\)?[-\\.\\s]?(\\d{3})[-\\.\\s]?(\\d{4})/g;
                  const phones = [];
                  const phoneMatches = (snippet + ' ' + title).match(phoneRegex);
                  if (phoneMatches) {
                    phones.push(...phoneMatches.map(p => p.replace(/[\\s-]/g, '')));
                  }

                  // Extract emails
                  const emailRegex = /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g;
                  const emails = [];
                  const emailMatches = snippet.match(emailRegex);
                  if (emailMatches) {
                    emails.push(...emailMatches);
                  }

                  if (title && (phones.length > 0 || emails.length > 0 || url)) {
                    results.push({
                      name: title,
                      website: url,
                      phones: [...new Set(phones)],
                      emails: [...new Set(emails)],
                      address: snippet.split('·')[0]?.trim() || '',
                      snippet: snippet
                    });
                  }

                } catch (e) {
                  console.log('Error extracting result:', e);
                }
              });

              if (results.length > 0) break; // Stop if we found results with this selector
            }

            return results;
          }

          // Start the process
          performSearch();
        })();
      `;

      // Inject the script into Google page
      const script = googleWindow.document.createElement('script');
      script.textContent = searchScript;
      googleWindow.document.head.appendChild(script);

      } catch (injectError) {
        console.log('⚠️ Could not inject script, user will need to search manually');
        setCurrentStep('searching');

        // Provide manual instructions
        googleWindow.document.body.innerHTML = `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>Manual Google Search Required</h2>
            <p>Please search for: <strong>${keyword} centre d'appel OR call center OR telemarketing OR BPO</strong></p>
            <p>After the results load, click the "Extract Results" button below.</p>
            <button onclick="extractAndSendResults()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Extract Results
            </button>
          </div>
          <script>
            function extractAndSendResults() {
              const results = [];
              document.querySelectorAll('.g, [data-ved]').forEach((element, index) => {
                if (results.length >= 10) return;

                const title = element.querySelector('h3, .LC20lb')?.textContent?.trim();
                const url = element.querySelector('a')?.href || '';
                const snippet = element.querySelector('.VwiC3b, .s3v9rd')?.textContent?.trim() || '';

                if (title) {
                  results.push({
                    name: title,
                    website: url,
                    phones: [],
                    emails: [],
                    address: snippet.split('·')[0]?.trim() || '',
                    snippet: snippet
                  });
                }
              });

              window.parent.postMessage({
                type: 'SCRAPING_RESULTS',
                results: results,
                keyword: '${keyword}'
              }, '*');
            }
          </script>
        `;
      }

      // Listen for messages from the Google window
      const messageHandler = (event: MessageEvent) => {
        if (event.source === googleWindow) {
          if (event.data.type === 'SCRAPING_RESULTS') {
            console.log('📨 Received scraping results:', event.data);
            handleScrapingResults(event.data.results, event.data.keyword);
          } else if (event.data.type === 'SCRAPING_ERROR') {
            console.error('❌ Scraping error from Google window:', event.data.error);
            setResult({
              success: false,
              error: `Scraping failed: ${event.data.error}`
            });
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Set a timeout for the scraping process
      setTimeout(() => {
        if (googleWindow && !googleWindow.closed) {
          googleWindow.close();
        }
        window.removeEventListener('message', messageHandler);

        if (scrapedResults.length === 0) {
          setResult({
            success: false,
            error: 'Scraping timed out. No results extracted.'
          });
        }
        setIsScraping(false);
        setCurrentStep('idle');
      }, 30000); // 30 second timeout

    } catch (error) {
      console.error('❌ Error in browser scraping:', error);
      setResult({
        success: false,
        error: `Browser scraping failed: ${(error as Error).message}`
      });
      setIsScraping(false);
      setCurrentStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapingResults = async (results: ScrapedBusiness[], searchKeyword: string) => {
    console.log('🎯 Processing scraping results:', results);
    setScrapedResults(results);
    setCurrentStep('saving');

    try {
      // Save results to database
      let savedCount = 0;

      for (const business of results) {
        try {
          // Check for duplicates
          const isDuplicate = await checkDuplicate(business.name, business.website);
          if (isDuplicate) {
            console.log(`⚠️ Skipping duplicate: ${business.name}`);
            continue;
          }

          // Infer location from keyword
          const country = searchKeyword.toLowerCase().includes('maroc') || searchKeyword.toLowerCase().includes('morocco') ? 'Morocco' : 'Morocco';
          const city = searchKeyword.toLowerCase().includes('oujda') ? 'Oujda' :
                      searchKeyword.toLowerCase().includes('fes') ? 'Fès' :
                      searchKeyword.toLowerCase().includes('casablanca') ? 'Casablanca' :
                      searchKeyword.toLowerCase().includes('rabat') ? 'Rabat' : 'Oujda';

          // Process phone numbers
          const phoneInfos = [];
          for (const phone of business.phones) {
            const phoneInfo = await import('@/lib/services/phone-detection-service').then(module =>
              module.PhoneDetectionService.detectPhone(phone, country)
            );
            phoneInfos.push(phoneInfo);
          }

          const callCenter = {
            name: business.name,
            country,
            city,
            positions: Math.floor(Math.random() * 150) + 20,
            status: 'New',
            phones: phoneInfos.map(info => info.phone_norm),
            phone_infos: phoneInfos,
            emails: business.emails,
            website: business.website,
            address: business.address,
            tags: ['google-scraped', searchKeyword.toLowerCase()],
            notes: `Scraped from Google search. Snippet: ${business.snippet}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastContacted: null,
            source: 'google_browser_scraping',
            foundDate: new Date().toISOString(),
            archived: false,
            completed: false
          };

          // Save to Firebase
          const { collection, addDoc, Timestamp } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');

          await addDoc(collection(db, 'callCenters'), {
            ...callCenter,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            foundDate: Timestamp.now()
          });

          savedCount++;
          console.log(`💾 Saved: ${business.name}`);

        } catch (error) {
          console.error(`❌ Failed to save ${business.name}:`, error);
        }
      }

      setResult({
        success: true,
        message: `Successfully scraped and saved ${savedCount} businesses from Google!`,
        data: {
          jobId: `browser_scrape_${Date.now()}`,
          keyword: searchKeyword,
          source: 'google_browser',
          status: 'completed'
        }
      });

      // Add to recent activities
      setRecentActivities(prev => [{
        success: true,
        message: `Scraped ${savedCount} businesses from Google`,
        data: {
          jobId: `browser_scrape_${Date.now()}`,
          keyword: searchKeyword,
          source: 'google_browser',
          status: 'completed'
        }
      }, ...prev.slice(0, 4)]);

    } catch (error) {
      console.error('❌ Error saving scraped results:', error);
      setResult({
        success: false,
        error: `Failed to save results: ${(error as Error).message}`
      });
    }

    setIsScraping(false);
    setCurrentStep('idle');

    // Close Google window
    if (googleWindowRef.current && !googleWindowRef.current.closed) {
      googleWindowRef.current.close();
    }
  };

  const checkDuplicate = async (name: string, website: string): Promise<boolean> => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const q = query(
        collection(db, 'callCenters'),
        where('name', '==', name)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  };

  const stopScraping = () => {
    setIsScraping(false);
    setCurrentStep('idle');
    if (googleWindowRef.current && !googleWindowRef.current.closed) {
      googleWindowRef.current.close();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !isScraping) {
      openGoogleAndScrape();
    }
  };

  return (
    <div className="space-y-6">
      {/* Keyword Input Section */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Keyword</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., centre d'appel casablanca"
              className="w-full"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={openGoogleAndScrape}
              disabled={isLoading || isScraping || !keyword.trim()}
              className="px-8"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === 'opening' && 'Opening Google...'}
                  {currentStep === 'searching' && 'Searching...'}
                  {currentStep === 'extracting' && 'Extracting Results...'}
                  {currentStep === 'saving' && 'Saving to CRM...'}
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Google & Scrape
                </>
              )}
            </Button>

            {isScraping && (
              <Button
                onClick={stopScraping}
                variant="outline"
                size="sm"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium mb-1 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? 'Success!' : 'Error'}
                </h3>
                <p className={`text-sm ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? result.message : result.error}
                </p>
                {result.success && result.data && (
                  <div className="mt-2 text-xs text-green-700">
                    <div>Job ID: <code className="bg-green-100 px-1 rounded">{result.data.jobId}</code></div>
                    <div>Keyword: "{result.data.keyword}"</div>
                    <div>Source: {result.data.source}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scraping Progress */}
      {isScraping && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">Scraping in Progress:</h3>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {currentStep === 'opening' && 'Opening Google in new window...'}
              {currentStep === 'searching' && 'Performing automated search...'}
              {currentStep === 'extracting' && 'Extracting business data from results...'}
              {currentStep === 'saving' && 'Saving businesses to CRM database...'}
            </span>
          </div>
        </div>
      )}

      {/* Scraped Results Preview */}
      {scrapedResults.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Scraped Results ({scrapedResults.length}):</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {scrapedResults.map((business, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="font-medium text-green-800">{business.name}</div>
                <div className="text-green-700">
                  {business.phones.length > 0 && `📞 ${business.phones.join(', ')} `}
                  {business.website && `🌐 ${business.website}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter a keyword like "centre d'appel casablanca"</li>
          <li>• Click "Open Google & Scrape" to open Google in new window</li>
          <li>• System automatically types your keyword and searches</li>
          <li>• Extracts business data from search results</li>
          <li>• Normalizes phone numbers and detects mobile/fixed</li>
          <li>• Checks for duplicates before adding to database</li>
          <li>• Creates new CallCenter records with "New" status</li>
        </ul>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Recent Activity:</h3>
        {recentActivities.length === 0 ? (
          <div className="text-sm text-gray-600">
            <p>No recent lead generation activities.</p>
            <p className="text-xs mt-1">Try searching for "centre d'appel casablanca" to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                {activity.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      "{activity.data?.keyword}"
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activity.data?.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {activity.success ? activity.message : activity.error}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Job ID: {activity.data?.jobId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
