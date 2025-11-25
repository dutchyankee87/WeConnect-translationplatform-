// Simple email notification service
// For production, you'd integrate with services like SendGrid, Resend, or AWS SES

interface EmailNotification {
  to: string[];
  subject: string;
  message: string;
  jobId: string;
  sourceFileName: string;
  targetLanguages: string[];
}

export class EmailService {
  
  /**
   * Send translation ready notification to countries
   * For now, this logs the email content - in production you'd send actual emails
   */
  static async sendTranslationReadyNotification(params: {
    jobId: string;
    sourceFileName: string;
    sourceLanguage: string;
    targetLanguages: string[];
    reviewUrl: string;
  }): Promise<boolean> {
    
    // Country email mapping (in production, this would come from a database)
    const countryEmails: Record<string, string[]> = {
      'NL': ['netherlands@quooker.com'],
      'DE': ['germany@quooker.com'],
      'FR': ['france@quooker.com'],
      'ES': ['spain@quooker.com'],
      'IT': ['italy@quooker.com'],
      'PT': ['portugal@quooker.com'],
    };

    try {
      for (const targetLang of params.targetLanguages) {
        const emails = countryEmails[targetLang];
        if (!emails) continue;

        const emailContent = {
          to: emails,
          subject: `🔔 Translation Ready for Review: ${params.sourceFileName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Translation Ready for Review</h1>
              </div>
              
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-top: 0;">Hello ${targetLang} Team,</h2>
                
                <p style="color: #64748b; line-height: 1.6;">
                  A new translation has been completed and is ready for your review:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #1e293b;"><strong>Document:</strong> ${params.sourceFileName}</p>
                  <p style="margin: 5px 0; color: #1e293b;"><strong>Translation:</strong> ${params.sourceLanguage} → ${targetLang}</p>
                  <p style="margin: 5px 0; color: #1e293b;"><strong>Job ID:</strong> ${params.jobId}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${params.reviewUrl}" 
                     style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                    📝 Review Translation
                  </a>
                </div>
                
                <div style="background: #fef3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>💡 Learning System:</strong> Your corrections help improve future translations automatically!
                  </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                  If you have any questions, please contact the Quooker translation team.
                </p>
              </div>
              
              <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
                <p style="margin: 0;">WeConnect Translation Platform | Powered by AI Learning</p>
              </div>
            </div>
          `,
          text: `
Translation Ready for Review

Hello ${targetLang} Team,

A new translation has been completed and is ready for your review:

Document: ${params.sourceFileName}
Translation: ${params.sourceLanguage} → ${targetLang}
Job ID: ${params.jobId}

Review URL: ${params.reviewUrl}

Your corrections help improve future translations automatically!

If you have any questions, please contact the Quooker translation team.

---
WeConnect Translation Platform | Powered by AI Learning
          `,
        };

        // In production, you would send the actual email here
        // Example with a service like Resend:
        // await resend.emails.send({
        //   from: 'WeConnect <notifications@quooker.com>',
        //   to: emails,
        //   subject: emailContent.subject,
        //   html: emailContent.html,
        // });

        // For now, just log the email
        console.log('📧 EMAIL NOTIFICATION (would be sent in production):');
        console.log('To:', emails.join(', '));
        console.log('Subject:', emailContent.subject);
        console.log('Content preview:', emailContent.text.substring(0, 200) + '...');
        console.log('---');
      }

      return true;
    } catch (error) {
      console.error('Failed to send email notifications:', error);
      return false;
    }
  }

  /**
   * Send correction submitted confirmation
   */
  static async sendCorrectionSubmittedConfirmation(params: {
    submitterEmail: string;
    jobId: string;
    targetLanguage: string;
    correctionCount: number;
    sourceFileName: string;
  }): Promise<boolean> {
    
    try {
      const emailContent = {
        to: [params.submitterEmail],
        subject: `✅ Corrections Submitted Successfully`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Corrections Submitted ✅</h1>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e293b; margin-top: 0;">Thank you!</h2>
              
              <p style="color: #64748b; line-height: 1.6;">
                Your ${params.correctionCount} correction${params.correctionCount === 1 ? '' : 's'} for the ${params.targetLanguage} translation have been successfully submitted.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 5px 0; color: #1e293b;"><strong>Document:</strong> ${params.sourceFileName}</p>
                <p style="margin: 5px 0; color: #1e293b;"><strong>Language:</strong> ${params.targetLanguage}</p>
                <p style="margin: 5px 0; color: #1e293b;"><strong>Corrections:</strong> ${params.correctionCount}</p>
              </div>
              
              <div style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>🧠 AI Learning:</strong> Your corrections will be automatically applied to future translations of similar content!
                </p>
              </div>
            </div>
          </div>
        `
      };

      // Log for now (in production, send actual email)
      console.log('📧 CORRECTION CONFIRMATION EMAIL (would be sent in production):');
      console.log('To:', params.submitterEmail);
      console.log('Subject:', emailContent.subject);
      console.log('Corrections submitted:', params.correctionCount);
      
      return true;
    } catch (error) {
      console.error('Failed to send correction confirmation:', error);
      return false;
    }
  }

  /**
   * Get country email addresses for a language
   */
  private static getCountryEmails(languageCode: string): string[] {
    const countryEmails: Record<string, string[]> = {
      'NL': ['netherlands@quooker.com', 'nl-review@quooker.com'],
      'DE': ['germany@quooker.com', 'de-review@quooker.com'],
      'FR': ['france@quooker.com', 'fr-review@quooker.com'],
      'ES': ['spain@quooker.com', 'es-review@quooker.com'],
      'IT': ['italy@quooker.com', 'it-review@quooker.com'],
      'PT': ['portugal@quooker.com', 'pt-review@quooker.com'],
    };

    return countryEmails[languageCode] || [];
  }
}