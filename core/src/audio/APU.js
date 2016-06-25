import log from '../common/log';
import {IRQ_APU} from '../proc/interrupts';
import PulseChannel from './PulseChannel';
import TriangleChannel from './TriangleChannel';
import NoiseChannel from './NoiseChannel';
import DMCChannel from './DMCChannel';

export default class APU {

  //=========================================================
  // Initialization
  //=========================================================

  constructor() {
    log.info('Initializing APU');
    this.pulseChannel1 = new PulseChannel(1);
    this.pulseChannel2 = new PulseChannel(2);
    this.triangleChannel = new TriangleChannel;
    this.noiseChannel = new NoiseChannel;
    this.dmcChannel = new DMCChannel;
    this.channelVolumes = [1, 1, 1, 1, 1];
    this.setRecordingEnabled(false);
  }

  connect(nes) {
    log.info('Connecting APU');
    this.cpu = nes.cpu;
    this.dmcChannel.connect(nes);
  }

  //=========================================================
  // Reset
  //=========================================================

  reset() {
    log.info('Reseting APU');
    this.clearFrameIRQ();
    this.pulseChannel1.reset();
    this.pulseChannel2.reset();
    this.triangleChannel.reset();
    this.noiseChannel.reset();
    this.dmcChannel.reset();
    this.writeFrameCounter(0);
  }

  activateFrameIRQ() {
    this.frameIrqActive = true;
    this.cpu.activateInterrupt(IRQ_APU);
  }

  clearFrameIRQ() {
    this.frameIrqActive = false;
    this.cpu.clearInterrupt(IRQ_APU);
  }

  //=========================================================
  // Configuration
  //=========================================================

  setRegionParams(params) {
    this.frameCounterMax4 = params.frameCounterMax4; // 4-step frame counter
    this.frameCounterMax5 = params.frameCounterMax5; // 5-step frame counter
    this.cpuFrequency = params.cpuFrequency;
    this.noiseChannel.setRegionParams(params);
    this.dmcChannel.setRegionParams(params);
  }

  //=========================================================
  // Frame counter register ($4017)
  //=========================================================

  writeFrameCounter(value) {
    this.frameCounterLast = value;                 // Used by CPU during reset
    this.frameFiveStepMode = (value & 0x80) !== 0; // 0 - mode 4 (4-step counter) / 1 - mode 5 (5-step counter)
    this.frameIrqDisabled = (value & 0x40) !== 0;  // IRQ generation is inhibited in mode 4
    this.frameStep = 0;                            // Step of the frame counter
    this.frameCounterResetDelay = 4;               // Counter should be reseted after 3 or 4 CPU cycles
    if (this.frameCounter == null) {
      this.frameCounter = this.getFrameCounterMax(); // Frame counter first initialization
    }
    if (this.frameIrqDisabled) {
      this.clearFrameIRQ(); // Disabling IRQ clears IRQ flag
    }
    if (this.frameFiveStepMode) {
      this.tickHalfFrame();
      this.tickQuarterFrame();
    }
  }

  getFrameCounterMax() {
    if (this.frameFiveStepMode) {
      return this.frameCounterMax5[this.frameStep];
    }
    return this.frameCounterMax4[this.frameStep];
  }

  //=========================================================
  // Pulse channel registers
  //=========================================================

  writePulseDutyEnvelope(id, value) {
    this.getPulseChannel(id).writeDutyEnvelope(value);
  }

  writePulseSweep(id, value) {
    this.getPulseChannel(id).writeSweep(value);
  }

  writePulseTimer(id, value) {
    this.getPulseChannel(id).writeTimer(value);
  }

  writePulseLengthCounter(id, value) {
    this.getPulseChannel(id).writeLengthCounter(value);
  }

  getPulseChannel(id) {
    return (id === 1) ? this.pulseChannel1 : this.pulseChannel2;
  }

  //=========================================================
  // Triangle channel registers
  //=========================================================

  writeTriangleLinearCounter(value) {
    this.triangleChannel.writeLinearCounter(value);
  }

  writeTriangleTimer(value) {
    this.triangleChannel.writeTimer(value);
  }

  writeTriangleLengthCounter(value) {
    this.triangleChannel.writeLengthCounter(value);
  }

  //=========================================================
  // Noise channel registers
  //=========================================================

  writeNoiseEnvelope(value) {
    this.noiseChannel.writeEnvelope(value);
  }

  writeNoiseTimer(value) {
    this.noiseChannel.writeTimer(value);
  }

  writeNoiseLengthCounter(value) {
    this.noiseChannel.writeLengthCounter(value);
  }

  //=========================================================
  // DMC channel registers
  //=========================================================

  writeDMCFlagsTimer(value) {
    this.dmcChannel.writeFlagsTimer(value);
  }

  writeDMCOutputLevel(value) {
    this.dmcChannel.writeOutputLevel(value);
  }

  writeDMCSampleAddress(value) {
    this.dmcChannel.writeSampleAddress(value);
  }

  writeDMCSampleLength(value) {
    this.dmcChannel.writeSampleLength(value);
  }

  //=========================================================
  // Channel volumes
  //=========================================================

  setChannelVolume(id, volume) {
    this.channelVolumes[id] = volume;
  }

  getChannelVolume(id) {
    return this.channelVolumes[id];
  }

  //=========================================================
  // Status register ($4015)
  //=========================================================

  writeStatus(value) {
    this.pulseChannel1.setEnabled((value & 0x01) !== 0);
    this.pulseChannel2.setEnabled((value & 0x02) !== 0);
    this.triangleChannel.setEnabled((value & 0x04) !== 0);
    this.noiseChannel.setEnabled((value & 0x08) !== 0);
    this.dmcChannel.setEnabled((value & 0x10) !== 0);
  }

  readStatus() {
    const value = this.getStatus();
    this.clearFrameIRQ();
    return value;
  }

  getStatus() {
    return (this.pulseChannel1.lengthCounter > 0)
       | (this.pulseChannel2.lengthCounter > 0) << 1
       | (this.triangleChannel.lengthCounter > 0) << 2
       | (this.noiseChannel.lengthCounter > 0) << 3
       | (this.dmcChannel.sampleRemainingLength > 0) << 4
       | (this.frameIrqActive) << 6
       | (this.dmcChannel.irqActive) << 7;
  }

  //=========================================================
  // CPU/DMA lock
  //=========================================================

  isBlockingCPU() {
    return this.dmcChannel.memoryAccessCycles > 0;
  }

  isBlockingDMA() {
    return this.dmcChannel.memoryAccessCycles > 2;
  }

  //=========================================================
  // Tick
  //=========================================================

  tick() {
    this.tickFrameCounter();
    this.pulseChannel1.tick();
    this.pulseChannel2.tick();
    this.triangleChannel.tick();
    this.noiseChannel.tick();
    this.dmcChannel.tick();
    if (this.recordingEnabled) {
      this.recordOutputValue();
    }
  }

  tickFrameCounter() {
    if (this.frameCounterResetDelay && --this.frameCounterResetDelay <= 0) {
      this.frameCounter = this.getFrameCounterMax();
    }
    if (--this.frameCounter <= 0) {
      this.tickFrameStep();
    }
  }

  tickFrameStep() {
    this.frameStep = (this.frameStep + 1) % 6;
    this.frameCounter = this.getFrameCounterMax();
    switch (this.frameStep) {
      case 1:
        this.tickQuarterFrame();
        break;
      case 2:
        this.tickQuarterFrame();
        this.tickHalfFrame();
        break;
      case 3:
        this.tickQuarterFrame();
        break;
      case 4:
        this.tickFrameIRQ();
        break;
      case 5:
        this.tickQuarterFrame();
        this.tickHalfFrame();
        this.tickFrameIRQ();
        break;
      case 0: // 6
        this.tickFrameIRQ();
        break;
    }
  }

  tickQuarterFrame() {
    this.pulseChannel1.tickQuarterFrame();
    this.pulseChannel2.tickQuarterFrame();
    this.triangleChannel.tickQuarterFrame();
    this.noiseChannel.tickQuarterFrame();
  }

  tickHalfFrame() {
    this.pulseChannel1.tickHalfFrame();
    this.pulseChannel2.tickHalfFrame();
    this.triangleChannel.tickHalfFrame();
    this.noiseChannel.tickHalfFrame();
  }

  tickFrameIRQ() {
    if (!this.frameIrqDisabled && !this.frameFiveStepMode) {
      this.activateFrameIRQ();
    }
  }

  //=========================================================
  // Output
  //=========================================================

  getOutputValue() {
    return this.getPulseOutputValue() + this.getTriangleNoiseDMCOutputValue();
  }

  getPulseOutputValue() {
    const pulse1Value = this.channelVolumes[0] * this.pulseChannel1.getOutputValue();
    const pulse2value = this.channelVolumes[1] * this.pulseChannel2.getOutputValue();
    if (pulse1Value || pulse2value) {
      return 95.88 / (8128 / (pulse1Value + pulse2value) + 100);
    }
    return 0;
  }

  getTriangleNoiseDMCOutputValue() {
    const triangleValue = this.channelVolumes[2] * this.triangleChannel.getOutputValue();
    const noiseValue = this.channelVolumes[3] * this.noiseChannel.getOutputValue();
    const dmcValue = this.channelVolumes[4] * this.dmcChannel.getOutputValue();
    if (triangleValue || noiseValue || dmcValue) {
      return 159.79 / (1 / (triangleValue / 8227 + noiseValue / 12241 + dmcValue / 22638) + 100);
    }
    return 0;
  }

  //=========================================================
  // Recording
  //=========================================================

  setRecordingEnabled(enabled) {
    this.recordingEnabled = enabled;
  }

  setBufferSize(size) {
    this.bufferSize = size;                     // Size of output and record buffer
    this.lastPosition = size - 1;               // Last position in the output/record buffer
    this.recordBuffer = new Float32Array(size); // Buffer to store recorded audio samples
    this.recordPosition = -1;                   // Buffer position of the last recorded sample
    this.recordCycle = 0;                       // CPU cycle counter
    this.outputBuffer = new Float32Array(size); // Buffer with cached audio samples to be send to sound card
    this.outputBufferFull = false;              // Wheter the output buffer is full
  }

  setSampleRate(rate) {
    this.sampleRate = rate;        // How often are samples taken (samples per second)
    this.sampleRateAdjustment = 0; // Sample rate adjustment per 1 output value (buffer underflow/overflow protection)
  }

  recordOutputValue() {
    const position = ~~(this.recordCycle++ * this.sampleRate / this.cpuFrequency);
    if (position > this.recordPosition) {
      this.fillRecordBuffer(position);
    }
  }

  fillRecordBuffer(position) {
    const outputValue = this.getOutputValue();
    if (position == null || position > this.lastPosition) {
      position = this.lastPosition;
    }
    while (this.recordPosition < position) {
      this.recordBuffer[++this.recordPosition] = outputValue;
      this.sampleRate += this.sampleRateAdjustment;
    }
    if (this.recordPosition >= this.lastPosition && !this.outputBufferFull) {
      this.swapOutputBuffer();
    }
  }

  swapOutputBuffer() {
    [this.outputBuffer, this.recordBuffer] = [this.recordBuffer, this.outputBuffer];
    this.outputBufferFull = true;
    this.recordPosition = -1;
    this.recordCycle = 0;
  }

  readOutputBuffer() {
    if (!this.outputBufferFull) {
      this.fillRecordBuffer(); // Buffer underflow
    }
    this.computeSamplingRateAdjustment();
    this.outputBufferFull = false;
    return this.outputBuffer;
  }

  computeSamplingRateAdjustment() {
    // Our goal is to have right now about 50% of data in buffer
    const percentageDifference = 0.5 - this.recordPosition / this.bufferSize; // Difference from the expected value
    this.sampleRateAdjustment = 100 * percentageDifference / this.bufferSize; // Adjustment per 1 output value in buffer
  }

}
