# Сервер ИИ-помощника «Мой ритм»

Этот Worker — защищённый серверный мост между GitHub Pages и OpenAI Responses API. API-ключ хранится только в Cloudflare Secrets и никогда не отправляется браузеру.

## Развёртывание через Cloudflare Dashboard

1. Открой Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Назови Worker точно `moy-ritm-assistant`.
3. После создания открой **Edit code**, замени код содержимым файла `worker.js` и нажми **Deploy**.
4. Открой настройки Worker → **Settings** → **Variables and Secrets** → **Add**.
5. Добавь переменную типа **Secret** с именем `OPENAI_API_KEY` и значением своего API-ключа OpenAI.
6. (Необязательно) Добавь переменную типа **Text** `ASSISTANT_MODEL` со значением `gpt-6.2-astra`.
7. Сохрани изменения и снова нажми **Deploy**.

Ожидаемый адрес: `https://moy-ritm-assistant.maks-zavalnitskiy.workers.dev`. Если Cloudflare выдаст другой адрес, обнови `ASSISTANT_API` в `index.html`.

## Проверка

Открой:

`https://moy-ritm-assistant.maks-zavalnitskiy.workers.dev/health`

Ожидаемый ответ после добавления секрета:

```json
{"ok":true,"configured":true,"service":"moy-ritm-assistant"}
```

После этого обнови сайт с Ctrl+F5 и отправь помощнику вопрос.

## Важно

- Создание API-ключа: https://platform.openai.com/api-keys
- Использование OpenAI API тарифицируется отдельно от подписки ChatGPT; проверь настройки Billing и лимиты расходов в OpenAI Platform.
- Никогда не вставляй API-ключ в `index.html`, GitHub, переписку или публичные файлы.
- Разрешённый источник запросов: `https://makszavalnitskiy-del.github.io`.
- На первом этапе помощник работает в режиме чтения: получает текст видимого расписания, краткую информацию об электричках и статистику достижений. Он не изменяет данные сайта.
- История сообщений хранится только в памяти открытой вкладки. Worker передаёт запрос с `store: false`; постоянная серверная история не создаётся.
- Ограничение частоты запросов в Worker — базовая защита на уровне экземпляра. Для публичного запуска стоит добавить Cloudflare Turnstile и Durable Objects/KV для распределённого rate limit.
- Telegram-бот в дальнейшем сможет обращаться к тому же API-слою после добавления аутентификации пользователей и общих серверных операций.
