
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Location, SearchMatch, IncidentPriority } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Processa áudio de voz para preencher automaticamente os dados de uma ocorrência.
 * Usa multimodalidade para entender contexto, endereço e gravidade.
 */
export async function processVoiceIncident(audioBase64: string, mimeType: string) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        },
        {
          text: `Você é um Médico Regulador do SAMU 192. Ouça o relato da ocorrência e extraia os dados estruturados.
          Importante: Identifique o endereço mencionado e tente ser preciso.
          Retorne estritamente em JSON:
          {
            "description": "descrição clara e técnica",
            "address": "endereço mencionado",
            "priority": "Vermelho" | "Amarelo" | "Verde" | "Azul",
            "code": "Código de protocolo (ex: P01, P10)",
            "isEmergency": boolean
          }`
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro ao processar voz:", error);
    return null;
  }
}

/**
 * Analisa a melhor rota de emergência e hospitais próximos usando Grounding do Google Maps.
 */
export async function analyzeEmergencyRoute(incidentLocation: Location) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Como assistente tático do SAMU, analise a localização [${incidentLocation.lat}, ${incidentLocation.lng}] em Ariquemes-RO. 
      Identifique os 3 hospitais ou UPAs mais próximos com pronto-socorro. 
      Cite também se há tráfego pesado conhecido ou obras na região central.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: incidentLocation.lat, longitude: incidentLocation.lng }
          }
        }
      },
    });

    return {
      text: response.text,
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Erro na análise de rota:", error);
    return null;
  }
}

/**
 * Busca de Endereço com Grounding do Google Maps para sugestões precisas.
 */
export async function getPlaceSuggestions(query: string, userLocation: Location): Promise<SearchMatch[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Liste 5 locais exatos para "${query}" em Ariquemes, Rondônia. 
    Retorne no formato: [Nome do Local] | [Endereço] | [Cidade] | [lat, lng]`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: userLocation.lat, longitude: userLocation.lng }
        }
      }
    },
  });

  const matches: SearchMatch[] = [];
  const text = response.text || "";
  const regex = /(.*?) \| (.*?) \| (.*?) \| \[(.*?), (.*?)\]/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({
      address: `${m[1]} - ${m[2]}`,
      city: m[3],
      lat: parseFloat(m[4]),
      lng: parseFloat(m[5])
    });
  }
  return matches;
}

/**
 * Triagem Inteligente: Classifica prioridade e protocolo.
 */
export async function classifyIncident(description: string): Promise<{ priority: IncidentPriority, reason: string, code: string, suggestedUnit: 'Advanced' | 'Basic' }> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise como Médico Regulador 192: "${description}"
    Retorne JSON: { "priority": "Vermelho"|"Amarelo"|"Verde"|"Azul", "code": "Pxx - Nome", "reason": "texto", "suggestedUnit": "Advanced"|"Basic" }`,
    config: { responseMimeType: "application/json" }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      priority: data.priority || IncidentPriority.MEDIUM,
      code: data.code || 'P00',
      reason: data.reason || 'Análise concluída.',
      suggestedUnit: data.suggestedUnit || 'Basic'
    };
  } catch (e) {
    return { priority: IncidentPriority.MEDIUM, code: 'P00', reason: "Erro na análise.", suggestedUnit: 'Basic' };
  }
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const getDistance = (l1: Location, l2: Location) => {
  const R = 6371;
  const dLat = (l2.lat - l1.lat) * Math.PI / 180;
  const dLon = (l2.lng - l1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const logOperationalEventFunctionDeclaration: FunctionDeclaration = {
  name: 'logOperationalEvent',
  parameters: {
    type: Type.OBJECT,
    description: 'Registra um evento importante na timeline da ocorrência do SAMU.',
    properties: {
      eventType: { type: Type.STRING },
      data: { type: Type.STRING }
    },
    required: ['eventType'],
  },
};

export async function generateVoiceAlert(text: string): Promise<Uint8Array | null> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Diga com voz firme: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64 ? decode(base64) : null;
  } catch { return null; }
}
