// Audio utilities to generate beeps without needing external audio files
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playTimerWarning = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
    return; // Don't queue sound if we just requested resume
  }
  
  if (audioCtx.state !== 'running') return;
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Gentle high pitch
  
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1); // Fade out
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 1);
};

export const playViolationWarning = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
    return; // Don't queue sound if we just requested resume
  }

  // Prevent queuing sounds if audio is blocked by autoplay policies
  if (audioCtx.state !== 'running') {
    return;
  }

  // Play a single long, loud, piercing buzzer sound
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = 'sawtooth'; // Harsher and louder sound
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 pitch
  
  // Set high volume and hold it
  gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime + 1.2); // Hold max volume for 1.2 seconds
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5); // Quick fade out
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 1.5);
};
