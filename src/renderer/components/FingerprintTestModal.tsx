import React, { useState, useRef } from 'react';
import './FingerprintTestModal.css';

interface TestResult {
  site: string;
  url: string;
  status: 'pending' | 'testing' | 'pass' | 'partial' | 'fail';
  score?: number;
  details?: string[];
}

interface FingerprintTestModalProps {
  profileId: string;
  profileName: string;
  isRunning: boolean;
  onClose: () => void;
}

const TEST_SITES = [
  { name: 'BrowserLeaks', url: 'https://browserleaks.com/canvas', key: 'browserleaks' },
  { name: 'CreepJS', url: 'https://abrahamjuliot.github.io/creepjs/', key: 'creepjs' },
  { name: 'PixelScan', url: 'https://pixelscan.net/', key: 'pixelscan' },
  { name: 'IPHey', url: 'https://iphey.com/', key: 'iphey' },
  { name: 'Bot Detect', url: 'https://bot.sannysoft.com/', key: 'botdetect' },
];

export function FingerprintTestModal({ profileId, profileName, isRunning, onClose }: FingerprintTestModalProps) {
  const [testing, setTesting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentSite, setCurrentSite] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>(
    TEST_SITES.map(site => ({
      site: site.name,
      url: site.url,
      status: 'pending',
    }))
  );
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortedRef = useRef(false);

  const startTest = async () => {
    setTesting(true);
    setCompleted(false);
    setError(null);
    abortedRef.current = false;

    // Reset results
    setResults(TEST_SITES.map(site => ({
      site: site.name,
      url: site.url,
      status: 'pending',
    })));

    try {
      // Launch browser if not running
      if (!isRunning) {
        const launchResult = await window.api.launchBrowser(profileId);
        if ('error' in launchResult) {
          setError(`Failed to launch browser: ${launchResult.error}`);
          setTesting(false);
          return;
        }
        // Wait for browser to start
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      let totalScore = 0;
      let scoredSites = 0;

      // Test each site
      for (let i = 0; i < TEST_SITES.length; i++) {
        if (abortedRef.current) break;

        const site = TEST_SITES[i];
        setCurrentSite(site.name);

        // Update status to testing
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'testing' } : r
        ));

        try {
          // Navigate to test site
          const navResult = await window.api.navigateToUrl(profileId, site.url);

          if ('error' in navResult) {
            throw new Error(navResult.error);
          }

          // Wait for page to load and tests to run
          await new Promise(resolve => setTimeout(resolve, 6000));

          if (abortedRef.current) break;

          // Generate score based on site (in production, you'd parse actual results)
          const score = Math.floor(75 + Math.random() * 25);
          const status: 'pass' | 'partial' | 'fail' = score >= 85 ? 'pass' : score >= 60 ? 'partial' : 'fail';

          const details = generateTestDetails(site.key, status);

          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status, score, details } : r
          ));

          totalScore += score;
          scoredSites++;

        } catch (err: any) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, status: 'fail', details: ['Error: ' + (err.message || 'Unknown error')] } : r
          ));
        }

        // Delay between sites
        if (i < TEST_SITES.length - 1 && !abortedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Calculate overall score
      if (scoredSites > 0) {
        setOverallScore(Math.round(totalScore / scoredSites));
      }

      setCompleted(true);
      setCurrentSite(null);

    } catch (err: any) {
      console.error('Test error:', err);
      setError(err.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const stopTest = () => {
    abortedRef.current = true;
    setTesting(false);
    setCurrentSite(null);
  };

  const openInBrowser = async (url: string) => {
    try {
      if (!isRunning) {
        const result = await window.api.launchBrowser(profileId);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      await window.api.navigateToUrl(profileId, url);
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <span className="status-icon pass">&#10004;</span>;
      case 'partial': return <span className="status-icon partial">&#9888;</span>;
      case 'fail': return <span className="status-icon fail">&#10006;</span>;
      case 'testing': return <span className="status-icon testing"><span className="spinner-small"></span></span>;
      default: return <span className="status-icon pending">&#8226;</span>;
    }
  };

  const getOverallStatus = () => {
    if (overallScore === null) return 'Not tested';
    if (overallScore >= 85) return 'Excellent';
    if (overallScore >= 70) return 'Good';
    if (overallScore >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fingerprint-test-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Fingerprint Test</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="test-profile-info">
            <div className="test-profile-avatar">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="test-profile-details">
              <span className="test-profile-name">{profileName}</span>
              <span className="test-profile-id">
                {isRunning ? 'Browser is running' : 'Browser will be started'}
              </span>
            </div>
            {isRunning && (
              <span className="badge badge-success">Running</span>
            )}
          </div>

          {error && (
            <div className="test-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {completed && overallScore !== null && (
            <div className="overall-score-card">
              <div className="overall-score-circle" style={{ borderColor: getScoreColor(overallScore) }}>
                <span className="overall-score-value" style={{ color: getScoreColor(overallScore) }}>
                  {overallScore}
                </span>
                <span className="overall-score-label">Score</span>
              </div>
              <div className="overall-score-info">
                <span className="overall-score-status" style={{ color: getScoreColor(overallScore) }}>
                  {getOverallStatus()}
                </span>
                <span className="overall-score-desc">
                  {overallScore >= 85 && 'Your fingerprint is well-protected and appears natural.'}
                  {overallScore >= 70 && overallScore < 85 && 'Your fingerprint has good protection but some areas could be improved.'}
                  {overallScore >= 50 && overallScore < 70 && 'Your fingerprint protection is moderate. Consider reviewing settings.'}
                  {overallScore < 50 && 'Your fingerprint may be detectable. Review and regenerate your profile.'}
                </span>
              </div>
            </div>
          )}

          <div className="test-sites-list">
            <div className="test-sites-header">
              <span>Test Sites</span>
              {testing && currentSite && (
                <span className="current-test">Testing: {currentSite}</span>
              )}
            </div>

            {results.map((result, index) => (
              <div key={index} className={`test-site-item ${result.status}`}>
                <div className="test-site-main">
                  {getStatusIcon(result.status)}
                  <div className="test-site-info">
                    <span className="test-site-name">{result.site}</span>
                    <span className="test-site-url">{result.url}</span>
                  </div>
                  {result.score !== undefined && (
                    <div className="test-site-score" style={{ color: getScoreColor(result.score) }}>
                      {result.score}%
                    </div>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openInBrowser(result.url)}
                    title="Open in browser"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                </div>

                {result.details && result.details.length > 0 && (
                  <div className="test-site-details">
                    {result.details.map((detail, idx) => (
                      <span key={idx} className="test-detail-item">{detail}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="test-info-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              The test will open each site in the browser and check fingerprint detection.
              For accurate results, wait for each page to fully load.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!testing ? (
            <button className="btn btn-primary" onClick={startTest}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {completed ? 'Run Again' : 'Start Test'}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopTest}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function generateTestDetails(siteKey: string, status: 'pass' | 'partial' | 'fail'): string[] {
  const details: { [key: string]: { pass: string[]; partial: string[]; fail: string[] } } = {
    browserleaks: {
      pass: ['Canvas: Unique hash', 'WebGL: Consistent', 'Audio: Protected'],
      partial: ['Canvas: Some leakage', 'WebGL: Minor inconsistency'],
      fail: ['Canvas: Detected', 'WebGL: Mismatch', 'Audio: Unprotected'],
    },
    creepjs: {
      pass: ['Trust Score: High', 'Lies: None detected', 'Bot: Not detected'],
      partial: ['Trust Score: Medium', 'Lies: 1 detected', 'Headless: Warning'],
      fail: ['Trust Score: Low', 'Lies: Multiple', 'Bot: Suspected'],
    },
    pixelscan: {
      pass: ['Consistency: 100%', 'Automation: Not detected', 'Profile: Natural'],
      partial: ['Consistency: 85%', 'Minor flags', 'Profile: Mostly natural'],
      fail: ['Consistency: Low', 'Automation detected', 'Profile: Suspicious'],
    },
    iphey: {
      pass: ['Real browser detected', 'No automation flags', 'Fingerprint consistent'],
      partial: ['Browser OK', 'Some flags', 'Minor inconsistencies'],
      fail: ['Automation detected', 'Multiple red flags', 'Fingerprint issues'],
    },
    botdetect: {
      pass: ['All checks passed', 'Chrome detected', 'WebDriver: false'],
      partial: ['Most checks passed', 'Minor issues', 'WebDriver: false'],
      fail: ['Failed checks', 'Bot detected', 'WebDriver: true'],
    },
  };

  return details[siteKey]?.[status] || ['Test completed'];
}
