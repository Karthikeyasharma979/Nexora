const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Pointing to deployed backend server

// Helper to get admin headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Helper to get all tests asynchronously
export const getAllTests = async () => {
  try {
    const response = await fetch(`${API_URL}/tests`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching all tests from backend:", error);
    // Fallback to local storage if API is down
    const data = localStorage.getItem('mettl_clone_tests');
    return data ? JSON.parse(data) : [];
  }
};

// Helper to save a test asynchronously
export const saveTest = async (test) => {
  try {
    const response = await fetch(`${API_URL}/tests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(test)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error saving test to backend:", error);
    // Fallback to local storage if API is down
    const data = localStorage.getItem('mettl_clone_tests');
    const tests = data ? JSON.parse(data) : [];
    tests.push(test);
    localStorage.setItem('mettl_clone_tests', JSON.stringify(tests));
    return test;
  }
};

// --- Reports API ---

export const getAllReports = async () => {
  try {
    const response = await fetch(`${API_URL}/reports`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch reports');
    return await response.json();
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

export const saveReport = async (reportData) => {
  try {
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
    if (!response.ok) throw new Error('Failed to save report');
    return await response.json();
  } catch (error) {
    console.error("Error saving report:", error);
    return null;
  }
};

export const saveDemoRequest = async (requestData) => {
  try {
    const response = await fetch(`${API_URL}/demo-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    if (!response.ok) throw new Error('Failed to save demo request');
    return await response.json();
  } catch (error) {
    console.error("Error saving demo request:", error);
    return null;
  }
};


// Helper to update a test asynchronously
export const updateTest = async (testId, test) => {
  try {
    const response = await fetch(`${API_URL}/tests/${testId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(test)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error updating test ${testId} to backend:`, error);
    // Fallback to local storage if API is down
    const data = localStorage.getItem('mettl_clone_tests');
    const tests = data ? JSON.parse(data) : [];
    const index = tests.findIndex(t => t.id === testId);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...test };
      localStorage.setItem('mettl_clone_tests', JSON.stringify(tests));
      return tests[index];
    }
    return null;
  }
};

// Helper to get a single test by ID asynchronously (PUBLIC route)
export const getTestById = async (testId) => {
  try {
    const response = await fetch(`${API_URL}/tests/${testId}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching test ${testId} from backend:`, error);
    // Fallback to local storage if API is down
    const data = localStorage.getItem('mettl_clone_tests');
    const tests = data ? JSON.parse(data) : [];
    const localTest = tests.find(t => t.id === testId);
    if (localTest) return localTest;
    
    throw error; // Throw the actual error so the UI shows "Fetch Error" and not "Test not found"
  }
};

// Helper to delete a test by ID asynchronously
export const deleteTest = async (testId) => {
  try {
    const response = await fetch(`${API_URL}/tests/${testId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting test ${testId} from backend:`, error);
    // Fallback to local storage if API is down
    const data = localStorage.getItem('mettl_clone_tests');
    let tests = data ? JSON.parse(data) : [];
    tests = tests.filter(t => t.id !== testId);
    localStorage.setItem('mettl_clone_tests', JSON.stringify(tests));
    return true;
  }
};

// --- Invite APIs ---
export const generateInviteLink = async (testId, candidateEmail) => {
  try {
    const response = await fetch(`${API_URL}/invite/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ testId, candidateEmail })
    });
    if (!response.ok) throw new Error('Failed to generate invite');
    return await response.json();
  } catch (error) {
    console.error("Error generating invite from backend:", error);
    // Fallback to local offline token
    const fallbackToken = btoa(JSON.stringify({ testId, candidateEmail, type: 'invite' }));
    return { token: fallbackToken, link: `nexora://invite/${fallbackToken}` };
  }
};

export const sendEmailInvite = async (testId, testName, candidateEmail) => {
  try {
    const response = await fetch(`${API_URL}/invite/send-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ testId, testName, candidateEmail })
    });
    if (!response.ok) throw new Error('Failed to send email');
    return await response.json();
  } catch (error) {
    console.error("Error sending email from backend:", error);
    throw error;
  }
};

// Keep initializeDB as noop or async noop to keep compatibility
export const initializeDB = async () => {
  // Database seeding is handled automatically on the Express backend!
  console.log("Database initialized. Seeding handled by the backend server.");
};
