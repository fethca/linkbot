import { ElementHandle } from 'puppeteer'

export function extractId(href: string | undefined): string | undefined {
  if (!href) return
  const match = href.match(/thread\/([^/?]+)/)
  return (match && match[1]) || ''
}

export const mockMessages = [
  {
    message: ` Bonjour Jérémy,
        Je voulais vous parler un peu plus en détail des avantages de travailler au sein de chez Wayne Engineering. 
        Outre des projets stimulants, nous offrons des opportunités de développement professionnel et un environnement propice à l'épanouissement de chacun de nos collaborateurs. 
        Un Career Manager vous sera dédié pour vous accompagner dans l'établissement de votre chemin de carrière. Vous pourrez établir avec lui un plan de formation qui vous permettra d'atteindre vos objectifs et de faire décoller votre carrière ! Est-ce que ça vous dirait qu'on en discute lors d'un premier échange téléphonique ? 😃
        Bien à vous,
        Edward Nygma
        Manager Recruiter chez Wayne Engineering
        06 06 06 06 06 06`,
    id: '2-NWM0MmI5OTktM2NlZi00NWFhLTkyYjYtMDcwODY0M2MyZGVkXzAxMA==',
  },
]

export function getPrompt(message: string) {
  return `
  Analyze the following LinkedIn message to determine the following:
  1. Is it a recruitment message?
  2. What is the sender's first name?
  3. Is this message a first contact or a reply?

  Respond in JSON format as follows:
  {
    "isRecruitment": boolean,
    "firstName": "sender's first name",
    "isFirstContact": boolean
  }

  Message:
  "${message}"
  `
}

export function getAnswer(firstName: string) {
  return `Bonjour ${firstName},

Merci pour l'intérêt que vous portez à mon profil. Avant tout, je préfère préciser que je recherche un poste en 100% remote, pour la simple raison que je compte à terme retourner dans mon département natal éloigné de tout : le Finistère. Cela fait plusieurs années que je travaille efficacement en distanciel pour plusieurs clients, notamment à Paris, donc je me focalise actuellement sur les entreprises/clients compatibles. Je comprendrais parfaitement que ce ne soit pas votre politique.


Si cela rentre dans vos critères, je suis disponible pour un échange. A priori j'aimerais partir sur des projets de développement web : backend ou frontend avec TypeScript. Je reste évidemment ouvert à toute proposition qui attirerait ma curiosité, donc discutons-en selon votre convenance.


Ce message a d’ailleurs été automatisé en NodeJs et son code disponible ici : https://github.com/fethca/linkbot. N’hésitez pas à retrouver mes autres créations directement sur Github ou mon portfolio.


Bonne journée, 

Jérémy
`
}

export const unwantedUA = (value: string) => {
  return !value.includes('Safari/537.3') && !value.includes('Windows NT 6.1')
}

export function findText(text: string) {
  return `::-p-xpath(//*[contains(text(), '${text}')])`
}

export function click(element: unknown) {
  if (element instanceof HTMLElement) {
    element.click()
  }
}

export function wrap(func: Promise<ElementHandle<Element> | null>): Promise<ElementHandle<Element> | null> {
  return func.then((el) => el).catch(() => null)
}
