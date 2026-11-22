# Бесплатный текстовый ИИ-помощник «Мой ритм»

Worker — защищённый серверный мост между GitHub Pages и Gemini API. Используется модель `gemini-2.5-flash` в бесплатном тарифе Gemini API. Генерация изображений отключена; помощник отвечает только текстом.

## Настройка Gemini API

1. Открой Google AI Studio: https://aistudio.google.com/app/apikey
2. Создай API key для проекта Google AI Studio.
3. Открой Cloudflare Dashboard → **Workers & Pages** → Worker **moy-ritm-assistant**.
4. В **Settings** → **Variables and Secrets** → **Add** добавь переменную типа **Secret**:
   - Name: `GEMINI_API_KEY`
   - Value: твой ключ Google AI Studio.
5. Сохрани и выполни Deploy (если Cloudflare попросит).

**Не отправляй ключ в чат и не добавляй его в GitHub или код сайта.** Он должен храниться только как Cloudflare Secret.

## Развёртывание Worker (если он ещё не создан)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Назови Worker точно `moy-ritm-assistant`.
3. Открой **Edit code**, замени содержимое кодом из `worker.js` и нажми **Deploy**.
4. Добавь секрет `GEMINI_API_KEY` по инструкции выше и снова разверни Worker.

Ожидаемый адрес: `https://moy-ritm-assistant.maks-zavalnitskiy.workers.dev`. Если адрес отличается, обнови `ASSISTANT_API` в `index.html`.

## Проверка

Открой:

`https://moy-ritm-assistant.maks-zavalnitskiy.workers.dev/health`

После настройки ожидается ответ с `"ok":true`, `"configured":true`, `"mode":"text-only"` и `"provider":"Gemini"`.

Затем открой сайт «Мой ритм» и обнови его через Ctrl+F5.

## Бесплатный тариф и ограничения

- Используется Gemini API с бесплатным тарифом; доступные модели и лимиты Google может менять. При достижении лимита ответы временно перестанут приходить до сброса квоты.
- Не подключай платный тариф Google Cloud и не добавляй платёжные данные, если хочешь строго бесплатное использование.
- У бесплатного тарифа Google может использовать запросы для улучшения продуктов — не отправляй в помощник чувствительные данные.
- Cloudflare Worker использует бесплатный тариф в пределах его лимитов.
- История сообщений хранится только в памяти открытой вкладки. Постоянная серверная история не создаётся.
- Помощник работает в режиме чтения: видит переданное расписание, информацию об электричках и статистику достижений, но пока не изменяет данные сайта.
- Telegram-бот в дальнейшем сможет обращаться к тому же API-слою после добавления аутентификации пользователей и общих серверных операций.

Официальные материалы:
- Gemini API: https://ai.google.dev/gemini-api/docs
- Тарифы: https://ai.google.dev/gemini-api/docs/pricing
- Google AI Studio: https://aistudio.google.com/
