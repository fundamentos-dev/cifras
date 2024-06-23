# Usar a imagem oficial do Nginx
FROM nginx:latest

# Remover a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar a configuração personalizada do Nginx (se existir)
COPY nginx.conf /etc/nginx/conf.d/

# Copiar os arquivos estáticos para a pasta servida pelo Nginx
COPY dist /usr/share/nginx/html

# Expor a porta 80 para acessar o Nginx
EXPOSE 80

# Comando para rodar o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]