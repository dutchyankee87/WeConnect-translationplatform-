"use client";

interface GlossaryWarning {
  segment: string;
  sourceTerm: string;
  targetTerm: string;
  message: string;
  segmentIndex: number;
}

interface NumberWarning {
  segment: string;
  sourceNumbers: string[];
  targetNumbers: string[];
  message: string;
  segmentIndex: number;
}

interface QAResultsProps {
  qualityScore: number;
  glossaryWarnings: GlossaryWarning[];
  numberWarnings: NumberWarning[];
}

export default function QAResults({ qualityScore, glossaryWarnings, numberWarnings }: QAResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const totalWarnings = glossaryWarnings.length + numberWarnings.length;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Quality Assurance Results</h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Total Warnings: <span className="font-medium">{totalWarnings}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(qualityScore)}`}>
            {qualityScore}/100 ({getScoreLabel(qualityScore)})
          </div>
        </div>
      </div>

      {totalWarnings === 0 ? (
        <div className="text-center py-8">
          <div className="text-green-600 text-lg font-medium mb-2">🎉 No Issues Found</div>
          <p className="text-gray-500">The translation passed all quality checks.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Glossary Warnings */}
          {glossaryWarnings.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Glossary Compliance Issues ({glossaryWarnings.length})
              </h4>
              <div className="space-y-3">
                {glossaryWarnings.map((warning, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-red-600">G</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-800 mb-1">
                          Segment {warning.segmentIndex + 1}: Missing term "{warning.targetTerm}"
                        </div>
                        <div className="text-sm text-red-700 mb-2">
                          {warning.message}
                        </div>
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                          <strong>Source:</strong> {warning.segment}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Number Warnings */}
          {numberWarnings.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Number Consistency Issues ({numberWarnings.length})
              </h4>
              <div className="space-y-3">
                {numberWarnings.map((warning, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-yellow-600">#</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-800 mb-1">
                          Segment {warning.segmentIndex + 1}: Number mismatch
                        </div>
                        <div className="text-sm text-yellow-700 mb-2">
                          {warning.message}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="text-gray-600 bg-white p-2 rounded border">
                            <strong>Source numbers:</strong> {warning.sourceNumbers.join(', ')}
                          </div>
                          <div className="text-gray-600 bg-white p-2 rounded border">
                            <strong>Target numbers:</strong> {warning.targetNumbers.join(', ')}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border mt-2">
                          <strong>Segment:</strong> {warning.segment}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p><strong>Quality Score Calculation:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>• Base score: 100 points</li>
            <li>• Glossary warnings: -10 points each</li>
            <li>• Number warnings: -15 points each</li>
          </ul>
        </div>
      </div>
    </div>
  );
}