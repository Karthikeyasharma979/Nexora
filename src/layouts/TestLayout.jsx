import React, { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import ProctoringEngine from '../components/ProctoringEngine';
import { getTestById } from '../utils/db';

const TestLayout = () => {
  const { testId } = useParams();
  const [requireCamera, setRequireCamera] = useState(true); // default true for safety
  const [requireSEB, setRequireSEB] = useState(true);
  const [testLoaded, setTestLoaded] = useState(false);

  useEffect(() => {
    if (testId) {
      getTestById(testId)
        .then(test => {
          if (test) {
            if (test.requireCamera === false) setRequireCamera(false);
            if (test.requireSEB === false) setRequireSEB(false);
          }
          setTestLoaded(true);
        })
        .catch(err => {
          console.error("Error loading test in layout:", err);
          setTestLoaded(true);
        });
    } else {
      setTestLoaded(true);
    }
  }, [testId]);

  if (!testLoaded) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading test environment...</div>;

  return (
    <ProctoringEngine requireCamera={requireCamera} requireSEB={requireSEB}>
      <div className="test-layout-container">
        <Outlet />
      </div>
    </ProctoringEngine>
  );
};

export default TestLayout;
