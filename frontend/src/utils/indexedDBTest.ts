/**
 * IndexedDB Test Utility
 * 
 * This utility helps test and verify that the IndexedDB fixes are working correctly.
 */

export const testIndexedDB = async (): Promise<{
  success: boolean;
  errors: string[];
  details: string[];
}> => {
  const errors: string[] = [];
  const details: string[] = [];
  
  try {
    details.push('Starting IndexedDB test...');
    
    if (!window.indexedDB) {
      errors.push('IndexedDB not available in this browser');
      return { success: false, errors, details };
    }
    
    details.push('IndexedDB API available');
    
    // Test database creation and object store handling
    const dbName = 'ChainAcademyTestDB';
    const version = 1;
    
    const testResult = await new Promise<boolean>((resolve) => {
      try {
        const request = indexedDB.open(dbName, version);
        
        request.onerror = () => {
          errors.push('Failed to open test database');
          details.push('Database open error: ' + request.error?.message);
          resolve(false);
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Test object store creation
            if (!db.objectStoreNames.contains('testStore')) {
              db.createObjectStore('testStore', { keyPath: 'id' });
              details.push('Created test object store successfully');
            } else {
              details.push('Test object store already exists');
            }
            
          } catch (error) {
            errors.push('Error during database upgrade: ' + (error as Error).message);
            resolve(false);
          }
        };
        
        request.onsuccess = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            details.push('Database opened successfully');
            
            // Test transaction creation
            if (db.objectStoreNames.contains('testStore')) {
              const transaction = db.transaction(['testStore'], 'readwrite');
              
              transaction.onerror = () => {
                errors.push('Transaction error: ' + transaction.error?.message);
                db.close();
                resolve(false);
              };
              
              transaction.oncomplete = () => {
                details.push('Transaction completed successfully');
                db.close();
                
                // Clean up test database
                setTimeout(() => {
                  const deleteRequest = indexedDB.deleteDatabase(dbName);
                  deleteRequest.onsuccess = () => {
                    details.push('Test database cleaned up');
                  };
                }, 100);
                
                resolve(true);
              };
              
              const store = transaction.objectStore('testStore');
              
              // Test data operations
              const testData = { id: 'test1', data: 'test data' };
              const addRequest = store.add(testData);
              
              addRequest.onsuccess = () => {
                details.push('Test data added successfully');
                
                // Test read operation
                const getRequest = store.get('test1');
                getRequest.onsuccess = () => {
                  if (getRequest.result) {
                    details.push('Test data retrieved successfully');
                  } else {
                    errors.push('Failed to retrieve test data');
                  }
                };
              };
              
              addRequest.onerror = () => {
                errors.push('Failed to add test data: ' + addRequest.error?.message);
                db.close();
                resolve(false);
              };
              
            } else {
              errors.push('Test object store was not created');
              db.close();
              resolve(false);
            }
            
          } catch (error) {
            errors.push('Error in success handler: ' + (error as Error).message);
            resolve(false);
          }
        };
        
      } catch (error) {
        errors.push('Error opening database: ' + (error as Error).message);
        resolve(false);
      }
    });
    
    return {
      success: testResult && errors.length === 0,
      errors,
      details
    };
    
  } catch (error) {
    errors.push('Unexpected error during test: ' + (error as Error).message);
    return { success: false, errors, details };
  }
};

// Test NotificationContext IndexedDB specifically
export const testNotificationIndexedDB = async (): Promise<{
  success: boolean;
  errors: string[];
  details: string[];
}> => {
  const errors: string[] = [];
  const details: string[] = [];
  
  try {
    details.push('Testing NotificationContext IndexedDB...');
    
    const dbName = 'ChainAcademyNotifications';
    const version = 2;
    const storeName = 'sessionReminders';
    
    const testResult = await new Promise<boolean>((resolve) => {
      try {
        const request = indexedDB.open(dbName, version);
        
        request.onerror = () => {
          errors.push('Failed to open notifications database');
          resolve(false);
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
              details.push('Created sessionReminders object store');
            }
            
          } catch (error) {
            errors.push('Error creating object store: ' + (error as Error).message);
            resolve(false);
          }
        };
        
        request.onsuccess = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            details.push('Notifications database opened successfully');
            
            // Test if object store exists
            if (!db.objectStoreNames.contains(storeName)) {
              errors.push('sessionReminders object store does not exist');
              db.close();
              resolve(false);
              return;
            }
            
            // Test transaction
            const transaction = db.transaction([storeName], 'readonly');
            
            transaction.onerror = () => {
              errors.push('Transaction failed: ' + transaction.error?.message);
              db.close();
              resolve(false);
            };
            
            transaction.oncomplete = () => {
              details.push('Read transaction completed successfully');
              db.close();
              resolve(true);
            };
            
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              details.push('Successfully retrieved all notification data');
            };
            
            getAllRequest.onerror = () => {
              errors.push('Failed to retrieve notification data');
              db.close();
              resolve(false);
            };
            
          } catch (error) {
            errors.push('Error in success handler: ' + (error as Error).message);
            resolve(false);
          }
        };
        
      } catch (error) {
        errors.push('Error opening notifications database: ' + (error as Error).message);
        resolve(false);
      }
    });
    
    return {
      success: testResult && errors.length === 0,
      errors,
      details
    };
    
  } catch (error) {
    errors.push('Unexpected error during notification test: ' + (error as Error).message);
    return { success: false, errors, details };
  }
};

// Make tests available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).chainAcademyIndexedDBTest = {
    test: testIndexedDB,
    testNotifications: testNotificationIndexedDB
  };
}