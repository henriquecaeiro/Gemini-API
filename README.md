
# Gemini API

Este projeto, desenvolvido para a seleção de desenvolvedor na Shopper.com.br, implementa um serviço de back-end em Node.js com TypeScript para automatizar a leitura de consumo de água e gás através de fotos de medidores, utilizando a inteligência artificial da API Gemini do Google. Com uma arquitetura focada em segurança, escalabilidade e manutenção simplificada, o sistema é completamente dockerizado, facilitando a configuração e operação em diferentes ambientes. O banco de dados utilizado é o MySQL, escolhido por sua robustez e ampla adoção em aplicações empresariais. Este projeto engloba endpoints para upload, confirmação e listagem de leituras, promovendo uma gestão eficaz do consumo de recursos.

## Começando

Estas instruções fornecerão uma cópia do projeto em execução na sua máquina local para fins de desenvolvimento e teste. O projeto é completamente dockerizado, o que significa que você pode colocá-lo em funcionamento com um único comando.

### Pré-requisitos

Para rodar este projeto, você precisará ter o Docker instalado na sua máquina. A instalação do Docker varia conforme o sistema operacional, então consulte [a documentação oficial do Docker](https://docs.docker.com/get-docker/) para instruções específicas de instalação.

### Instalação e Execução

Com o Docker instalado, você pode configurar e executar o projeto com o seguinte comando:
```plaintext
docker-compose up --build
```

### Uso

Após executar os comandos acima, o servidor estará ativo e pode ser acessado via:

```plaintext
http://localhost
```

## Estrutura do banco de dados

O banco de dados MySQL é utilizado, com a seguinte estrutura:

- **Tabela `customers`**:
  - `customer_code` (int, chave primária, autoincremento)
  - `name` (varchar(255))
  - `email` (varchar(255))

- **Tabela `measurements`**:
  - `measurement_id` (int, chave primária, autoincremento)
  - `customer_code` (int, chave estrangeira referenciando `customers`)
  - `measure_datetime` (datetime)
  - `measure_type` (enum('WATER','GAS'))
  - `measure_value` (float, opcional)
  - `measure_uuid` (varchar(255), único)
  - `image_url` (varchar(255), opcional)
  - `confirmed` (tinyint(1), padrão '0')

Relações:
- A tabela `measurements` possui uma chave estrangeira que liga `customer_code` à tabela `customers`.

## Variávei de ambiente

ara garantir a conexão segura e configurável ao banco de dados e à API Gemini, você deve configurar as seguintes variáveis de ambiente no arquivo `.env`, que deve estar localizado na raiz do seu projeto:

```plaintext
DB_HOST=         # Endereço do host do banco de dados
DB_USER=         # Usuário para acesso ao banco de dados
DB_PASSWORD=     # Senha para acesso ao banco de dados
DB_NAME=         # Nome do banco de dados
GEMINI_API_KEY=  # Chave de API para acesso ao Gemini
```
## Documentação da API

#### Recebe uma imagem em base64, consulta o Gemini e retorna a medida lida pela API.

```plaintext
POST /upload
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `image` | `base64` | Imagem em no formato base64 |
| `customer_code` | `string` | Código do consumidor no qual a medição será guardada |
| `measure_datetime` | `datetime` | Data da na qual a medição foi realizada  |
| `measure_type` | `string` | Tipo de medição `WATER` ou `GAS`  |


#### Confirma ou corrige o valor lido pelo LLM.

```plaintext
  PATCH /confirm
```

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `measure_type`| `string` | O `ID` da medição|
| `confirmed_value`| `integer` | O valor confirmado|

#### Lista as medidas realizadas por um cliente específico.

```plaintext
  GET /<customer_code>/list?measure_type=`Tipo de medição`
```

| Parâmetro   | Tipo       | Descrição                                   |
| :---------- | :--------- | :------------------------------------------ |
| `customer_code` | `string` | O código do consumidor que dever ser pesquisado. **Observação:** deve ser inserido na url
| `Tipo de Medição` | `string` | Qual tipo de medição que dever ser pesquisado. **Observação:** deve ser inserido na url