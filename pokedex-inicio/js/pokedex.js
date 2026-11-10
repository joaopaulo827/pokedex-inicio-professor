// Pokédex da aula 19: consumo de API com fetch, async/await e HTTP
// Documentação da API: https://pokeapi.co/docs/v2

const API = "https://pokeapi.co/api/v2"
const POR_PAGINA = 20

let pokemonAtual = null   // o pokémon que está no card (usado no 4.1)

const form = document.querySelector("#form-busca")
const campoBusca = document.querySelector("#busca")
const botaoBuscar = document.querySelector("#botao-buscar")
const mensagem = document.querySelector("#mensagem")
const card = document.querySelector("#card")
const lista = document.querySelector("#lista")
const botaoAnterior = document.querySelector("#anterior")
const botaoProxima = document.querySelector("#proxima")
const textoPagina = document.querySelector("#pagina")

// 2.1: a API responde em inglês; um objeto traduz (aula 11)
const TIPOS = {
  normal: "Normal", fire: "Fogo", water: "Água", grass: "Planta", electric: "Elétrico",
  ice: "Gelo", fighting: "Lutador", poison: "Veneno", ground: "Terra", flying: "Voador",
  psychic: "Psíquico", bug: "Inseto", rock: "Pedra", ghost: "Fantasma", dragon: "Dragão",
  dark: "Sombrio", steel: "Aço", fairy: "Fada"
}

const STATUS = {
  hp: "Vida", attack: "Ataque", defense: "Defesa",
  "special-attack": "Ataque esp.", "special-defense": "Defesa esp.", speed: "Velocidade"
}

const mostrarMensagem = (texto, tipo) => {
  mensagem.textContent = texto
  mensagem.className = tipo
}

const limparMensagem = () => {
  mensagem.textContent = ""
  mensagem.className = ""
}

// ===== Módulo 1 e 2: buscar um pokémon =====

// 1.3: a função de busca. Devolve o objeto do pokémon ou lança um erro.
const buscarPokemon = async (nomeOuNumero) => {
  const resposta = await fetch(API + "/pokemon/" + nomeOuNumero)

  // 2.3: 404 não cai no catch sozinho; o fetch só "falha" sem resposta
  if (resposta.status === 404) {
    throw new Error("Pokémon não encontrado.")
  }
  if (!resposta.ok) {
    throw new Error("A API respondeu com erro " + resposta.status + ".")
  }

  return await resposta.json()   // o corpo da resposta, já como objeto
}

// 2.1: "#25" vira "#025"
const formatarNumero = (id) => "#" + String(id).padStart(3, "0")

// 2.1 e 2.4: monta o card a partir do objeto que a API devolveu
const mostrarCard = (pokemon) => {
  document.querySelector("#card-nome").textContent = pokemon.name
  document.querySelector("#card-numero").textContent = formatarNumero(pokemon.id)

  // 1.3: "official-artwork" tem traço, por isso o colchete
  const imagem = document.querySelector("#card-imagem")
  imagem.src = pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default
  imagem.alt = "Imagem de " + pokemon.name

  // 2.1: tipos é um array de objetos: [{ slot, type: { name, url } }]
  const tipos = document.querySelector("#card-tipos")
  tipos.textContent = ""
  pokemon.types.forEach((item) => {
    const etiqueta = document.createElement("span")
    etiqueta.classList.add("tipo")
    etiqueta.textContent = TIPOS[item.type.name] || item.type.name
    tipos.append(etiqueta)
  })

  // 2.1: a API usa decímetros e hectogramas; toLocaleString põe a vírgula
  const altura = (pokemon.height / 10).toLocaleString("pt-BR")
  const peso = (pokemon.weight / 10).toLocaleString("pt-BR")
  document.querySelector("#card-medidas").textContent =
    "Altura: " + altura + " m · Peso: " + peso + " kg"

  // 2.4: barras de status (255 é o maior valor possível)
  const status = document.querySelector("#card-status")
  status.textContent = ""
  pokemon.stats.forEach((item) => {
    const linha = document.createElement("li")
    const nome = document.createElement("span")
    nome.textContent = STATUS[item.stat.name] || item.stat.name
    const valor = document.createElement("strong")
    valor.textContent = item.base_stat
    const barra = document.createElement("div")
    barra.classList.add("barra")
    const preenchido = document.createElement("span")
    preenchido.style.width = (item.base_stat / 255 * 100) + "%"
    barra.append(preenchido)
    linha.append(nome, valor, barra)
    status.append(linha)
  })

  card.hidden = false
  pokemonAtual = pokemon
  atualizarBotaoFavorito()   // 4.1
}

// 2.2 e 2.3: buscar com "carregando" e com tratamento de erro
const carregarPokemon = async (nomeOuNumero) => {
  botaoBuscar.disabled = true
  botaoBuscar.textContent = "Buscando..."
  mostrarMensagem("Buscando " + nomeOuNumero + "...", "alerta")

  try {
    const pokemon = await buscarPokemon(nomeOuNumero)
    mostrarCard(pokemon)
    limparMensagem()
  } catch (erro) {
    if (erro instanceof TypeError) {
      // TypeError: o fetch nem recebeu resposta (sem internet, endereço errado)
      mostrarMensagem("Sem conexão com a API. Confira a internet.", "erro")
    } else {
      mostrarMensagem(erro.message, "erro")
    }
  } finally {
    botaoBuscar.disabled = false
    botaoBuscar.textContent = "Buscar"
  }
}

// 2.1: o submit da busca
form.addEventListener("submit", (event) => {
  event.preventDefault()
  let texto = campoBusca.value.trim().toLowerCase()   // a API só aceita minúsculas

  if (texto === "") {
    mostrarMensagem("Digite um nome ou número.", "erro")
    return
  }
  if (/^\d+$/.test(texto)) {
    texto = String(Number(texto))   // "025" vira "25"
  }
  carregarPokemon(texto)
})

// ===== Módulo 3: lista com paginação =====

let paginaUrl = API + "/pokemon?limit=" + POR_PAGINA + "&offset=0"
let anteriorUrl = null
let proximaUrl = null

// 3.1: o id está no fim da url: ".../pokemon/25/" → "25"
const idDaUrl = (url) => {
  const partes = url.split("/")
  return partes[partes.length - 2]
}

// 3.1: imagem pequena, montada só com o id (sem outra requisição)
const urlMiniatura = (id) =>
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + id + ".png"

const carregarPagina = async (url) => {
  botaoAnterior.disabled = true
  botaoProxima.disabled = true
  textoPagina.textContent = "Carregando..."

  try {
    const resposta = await fetch(url)
    if (!resposta.ok) {
      throw new Error("status " + resposta.status)
    }
    const dados = await resposta.json()   // { count, next, previous, results }

    lista.textContent = ""
    dados.results.forEach((item) => {
      const id = idDaUrl(item.url)
      const li = document.createElement("li")
      const botao = document.createElement("button")
      botao.type = "button"
      const img = document.createElement("img")
      img.src = urlMiniatura(id)
      img.alt = ""
      img.loading = "lazy"
      const nome = document.createElement("span")
      nome.textContent = formatarNumero(id) + " " + item.name
      botao.append(img, nome)
      // 3.1: clicar na lista reaproveita a busca do módulo 2
      botao.addEventListener("click", () => {
        carregarPokemon(item.name)
        card.scrollIntoView({ behavior: "smooth" })
      })
      li.append(botao)
      lista.append(li)
    })

    // 3.2: a própria resposta diz onde estão a página anterior e a próxima
    anteriorUrl = dados.previous
    proximaUrl = dados.next
    const offset = Number(new URL(url).searchParams.get("offset")) || 0
    const pagina = offset / POR_PAGINA + 1
    const total = Math.ceil(dados.count / POR_PAGINA)
    textoPagina.textContent = "Página " + pagina + " de " + total
  } catch (erro) {
    textoPagina.textContent = "Não deu para carregar a lista."
  } finally {
    botaoAnterior.disabled = anteriorUrl === null
    botaoProxima.disabled = proximaUrl === null
  }
}

botaoAnterior.addEventListener("click", () => carregarPagina(anteriorUrl))
botaoProxima.addEventListener("click", () => carregarPagina(proximaUrl))

// ===== Módulo 4: para quem avança =====

// 4.1: favoritos no localStorage (aula 18)
const CHAVE_FAVORITOS = "pokedex-favoritos"
const botaoFavorito = document.querySelector("#botao-favorito")

const carregarFavoritos = () => {
  const texto = localStorage.getItem(CHAVE_FAVORITOS)
  if (texto === null) {
    return []
  }
  try {
    return JSON.parse(texto)
  } catch (erro) {
    return []
  }
}

let favoritos = carregarFavoritos()

// guardamos só id e nome: o resto vem da API quando precisar
const desenharFavoritos = () => {
  const area = document.querySelector("#lista-favoritos")
  area.textContent = ""
  favoritos.forEach((fav) => {
    const botao = document.createElement("button")
    botao.type = "button"
    botao.classList.add("botao-secundario")
    botao.textContent = fav.nome
    botao.addEventListener("click", () => carregarPokemon(fav.nome))
    area.append(botao)
  })
  document.querySelector("#favoritos").hidden = favoritos.length === 0
}

const ehFavorito = (id) => favoritos.some((fav) => fav.id === id)

const atualizarBotaoFavorito = () => {
  if (pokemonAtual !== null && ehFavorito(pokemonAtual.id)) {
    botaoFavorito.textContent = "Tirar dos favoritos"
  } else {
    botaoFavorito.textContent = "Favoritar"
  }
}

botaoFavorito.addEventListener("click", () => {
  if (ehFavorito(pokemonAtual.id)) {
    favoritos = favoritos.filter((fav) => fav.id !== pokemonAtual.id)
  } else {
    favoritos.push({ id: pokemonAtual.id, nome: pokemonAtual.name })
  }
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos))
  desenharFavoritos()
  atualizarBotaoFavorito()
})

// 4.2: três pedidos ao mesmo tempo com Promise.all
const botaoSortear = document.querySelector("#sortear")
botaoSortear.addEventListener("click", async () => {
  const time = document.querySelector("#time")
  botaoSortear.disabled = true
  time.textContent = ""

  // três números de 1 a 1021 (todas as geração)
  const numeros = [1, 2, 3, 4, 5, 6].map(() => Math.floor(Math.random() * 1025) + 1)

  try {
    // os três fetch saem juntos; o await espera o último chegar
    const pokemons = await Promise.all(numeros.map((n) => buscarPokemon(n)))
    pokemons.forEach((pokemon) => {
      const li = document.createElement("li")
      const botao = document.createElement("button")
      botao.type = "button"
      const img = document.createElement("img")
      img.src = pokemon.sprites.front_default
      img.alt = ""
      const nome = document.createElement("span")
      nome.textContent = pokemon.name + " · " + pokemon.types.map((t) => TIPOS[t.type.name]).join(" / ")
      botao.append(img, nome)
      botao.addEventListener("click", () => mostrarCard(pokemon))   // já temos os dados
      li.append(botao)
      time.append(li)
    })
  } catch (erro) {
    mostrarMensagem("Não deu para sortear o time. Tente de novo.", "erro")
  } finally {
    botaoSortear.disabled = false
  }
})
  const limite = 6
  let party=[]
  const desenharParty= ()=>{
    const lista = document.querySelector("#party")
    lista.textContent=""

    for (let i = 0; i < limite; i++) {
      const pokemon = party[i]
      const li = document.createElement("li")
      if (pokemon === undefined) {
        li.textContent ="Vazio"
        console.log("Vazio")
      } else {
        li.textContent = (i + 1) + ": " + pokemon.nome
        console.log((i + 1) + ": " + pokemon.nome)
      }
      lista.append(li)
    }
    document.querySelector("#titulo-party").textContent =
    "Minha party (" + party.length + "/6)"    
  }
  const capturar = (nome) => {
    const pokemon = {
      codigo: Date.now(),
      nome: nome
    }
  
    if (party.length < limite) {
      party.push(pokemon)
      salvarEDesenhar()
      mostrarMensagem(nome + " capturado!", "sucesso")
    } else {
      mostrarMensagem("Não há vagas na sua party.", "erro")
    }
  }
  const salvarEDesenhar = () => {
    localStorage.setItem("pokedex-party", JSON.stringify(party))
    desenharParty()
  }
  
  document.querySelector("#botao-capturar").addEventListener("click", () => {
    if (pokemonAtual !== null) {
      capturar(pokemonAtual.name)
    }
  })
  
  const dadosSalvos = localStorage.getItem("pokedex-party")
  
  if (dadosSalvos !== null) {
    party = JSON.parse(dadosSalvos)
  }
  
  desenharParty()    
// ao abrir a página
desenharFavoritos()
carregarPagina(paginaUrl)