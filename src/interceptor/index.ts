/**
 * Memory Interceptor Module
 *
 * Provides automatic context injection (pre-processing) and learning
 * extraction (post-processing) for seamless memory integration with
 * AI conversations.
 *
 * Components:
 * - PatternDetector: Detects decision patterns in AI responses
 * - PreProcessor: Enhances user prompts with relevant memory context
 * - PostProcessor: Extracts and stores learnings from conversations
 */

// Pattern Detector
export {
  PatternDetector,
  getPatternDetector,
  type DetectedPattern,
  type PatternType,
} from "./pattern-detector";

// Pre-Processor
export {
  PreProcessor,
  getPreProcessor,
  type PreProcessorConfig,
} from "./pre-processor";

// Post-Processor
export {
  PostProcessor,
  getPostProcessor,
  type PostProcessorConfig,
} from "./post-processor";
