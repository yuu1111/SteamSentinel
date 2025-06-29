import React from 'react'

// AlertContainer is now replaced by Ant Design's notification system
// This component is kept for compatibility but returns null
// All notifications are now handled through NotificationService and AlertContext
const AlertContainer: React.FC = () => {
  // Ant Design notifications are automatically positioned and managed
  // No manual container needed
  return null
}

export default AlertContainer