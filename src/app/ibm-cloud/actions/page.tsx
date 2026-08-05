// Stub de redirect permanente — /ibm-cloud/actions foi descontinuada em 03/08.
//
// A página listava 557 "actions" do IBM Cloud que não existiam: eram prosa em
// português escrita por nós, não identificadores publicados pela IBM. E não há
// como recoletá-las, porque a IBM NÃO publica lista de action por role — cada
// serviço mapeia as próprias ações para as 7 roles do IAM.
//
// Quem procurava "actions do IBM" queria uma de duas coisas: as roles do IAM,
// ou o modelo da infraestrutura clássica. Mandamos para as roles, que é o
// equivalente mais próximo; a página clássica está linkada de lá.
import { redirect } from 'next/navigation'

export default function Redirect() {
  redirect('/ibm-cloud/roles/')
}
