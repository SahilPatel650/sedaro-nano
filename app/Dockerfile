# NOTE: cuda image version must be compatable with host cuda version
# check https://docs.nvidia.com/deploy/cuda-compatibility/ 
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu20.04

# Create and set working directory
RUN mkdir /app
WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC
RUN apt-get update && apt-get install -y python3.10 python3-pip tzdata \
&& ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
&& dpkg-reconfigure --frontend noninteractive tzdata

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

CMD [ "python3", "-m" , "flask", "run", "--debug", "--host=0.0.0.0", "--port=8000" ]