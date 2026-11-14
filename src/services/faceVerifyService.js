import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition'
import fs from 'fs/promises'
import path from 'path'

const client = new RekognitionClient({ region: process.env.AWS_REGION || 'ap-south-1' })
const THRESHOLD = 90 // raise for stricter matching, lower if genuine users get rejected

export const loadReference = (relPath) => {
  const projectRoot = process.cwd() // folder you run `node` from: petrol-erp-backend
  const uploadsDir = path.resolve(projectRoot, 'uploads')

  const clean = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '')
  const full = path.resolve(projectRoot, clean)

  if (!full.startsWith(uploadsDir + path.sep)) throw new Error('Invalid reference path')

  return fs.readFile(full)
}

export async function compareFaces(selfieBytes, referenceBytes) {
  try {
    const out = await client.send(new CompareFacesCommand({
      SourceImage: { Bytes: selfieBytes },
      TargetImage: { Bytes: referenceBytes },
      SimilarityThreshold: THRESHOLD,
      QualityFilter: 'AUTO',
    }))
    const best = out.FaceMatches?.[0]
    return { matched: !!best, similarity: best?.Similarity ?? 0 }
  } catch (e) {
    // thrown when no face is found in an image
    if (e.name === 'InvalidParameterException') return { matched: false, similarity: 0, noFace: true }
    throw e
  }
}