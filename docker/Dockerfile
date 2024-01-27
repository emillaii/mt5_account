# Use CentOS 7 as the base image
FROM centos:7

# Install Node.js
RUN curl -sL https://rpm.nodesource.com/setup_14.x | bash -
RUN yum install -y nodejs

# Set the working directory
WORKDIR /app

# Copy your application files (assuming your Node.js app is in the same directory as this Dockerfile)
COPY . /app

# Install app dependencies
RUN npm install
RUN npm install -g http-server

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your app
COPY start.sh /start.sh
RUN chmod +x /start.sh
CMD ["./start.sh"]
