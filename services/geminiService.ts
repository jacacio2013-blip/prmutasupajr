import { GoogleGenAI } from "@google/genai";
import { LeaveRequest, SystemRules, User } from "../types";

// Safely get API Key
const getApiKey = () => {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            // @ts-ignore
            return process.env.API_KEY;
        }
    } catch(e) {}
    return '';
}

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const analyzeRequestConflict = async (
  request: LeaveRequest,
  history: LeaveRequest[],
  rules: SystemRules
): Promise<string> => {
  if (!apiKey) return "API Key não configurada. Não é possível realizar análise IA.";

  try {
    const recentRequests = history
      .filter(r => r.userId === request.userId)
      .slice(0, 5)
      .map(r => `- ${r.type} em ${r.dateStart}: ${r.status}`)
      .join('\n');

    const prompt = `
      Você é um assistente de IA para um Gerente de Enfermagem de uma UPA.
      Analise a seguinte solicitação de folga/permuta com base nas regras e histórico.

      **Regras da Unidade:**
      ${rules.content}

      **Solicitação Atual:**
      Funcionario: ${request.userName} (${request.userRole})
      Tipo: ${request.type}
      Data: ${request.dateStart}
      Motivo: ${request.description}
      Cobertura (se permuta): ${request.coveringEmployee || 'N/A'}

      **Histórico Recente do Funcionário:**
      ${recentRequests || 'Sem histórico recente.'}

      Por favor, forneça uma análise curta (máximo 3 frases) indicando se há algum conflito óbvio com as regras ou se parece razoável aprovar. Não tome a decisão final, apenas aconselhe o gerente.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar análise.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA para análise.";
  }
};

export const refineRulesText = async (currentRules: string, newTopic: string): Promise<string> => {
    if (!apiKey) return currentRules + "\n" + newTopic;

    try {
        const prompt = `
        Você é um especialista em gestão hospitalar. Reescreva e organize as seguintes regras da UPA José Rodrigues, adicionando o novo tópico solicitado de forma clara, profissional e empática. Mantenha a formatação clara.

        Regras Atuais:
        ${currentRules}

        Novo Tópico a Adicionar/Alterar:
        ${newTopic}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || currentRules;
    } catch (e) {
        return currentRules;
    }
}