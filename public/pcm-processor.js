
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32Data = input[0];
      // Post the raw float32 data back to the main thread
      this.port.postMessage(float32Data);
    }
    return true; // Keep the processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
