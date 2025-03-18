import axios from "axios";
import { RELAYER_URL } from "./constants";

class Relayer {
  private readonly apiRoute = "api";
  apiUrl: string;

  constructor(relayerUrl: string) {
    this.apiUrl = `${relayerUrl}${this.apiRoute}`;
  }

  // Similar to a ping or health endpoint
  async echo() {
    const res = await axios({
      method: "GET",
      url: `${this.apiUrl}/echo`,
    });
    return res.data;
  }

  async requestStatus(requestId: number) {
    const { data } = await axios({
      method: "POST",
      url: `${this.apiUrl}/requestStatus`,
      data: {
        request_id: requestId,
      },
    });
    return data;
  }

  async acceptanceRequest(
    controllerEthAddr: string,
    guardianEmailAddr: string,
    accountCode: string,
    templateIdx: number,
    command: string
  ): Promise<{ requestId: number }> {
    const { data } = await axios({
      method: "POST",
      url: `${this.apiUrl}/acceptanceRequest`,
      data: {
        controller_eth_addr: controllerEthAddr,
        guardian_email_addr: guardianEmailAddr,
        account_code: accountCode,
        template_idx: templateIdx,
        command,
      },
    });
    const { request_id: requestId } = data;
    return { requestId };
  }

  async recoveryRequest(
    controllerEthAddr: string,
    guardianEmailAddr: string,
    templateIdx: number,
    command: string
  ) {
    const { data } = await axios({
      method: "POST",
      url: `${this.apiUrl}/recoveryRequest`,
      data: {
        controller_eth_addr: controllerEthAddr,
        guardian_email_addr: guardianEmailAddr,
        template_idx: templateIdx,
        command,
      },
    });
    const { request_id: requestId } = data;
    return { requestId };
  }

  async completeRecovery(
    controllerEthAddr: string,
    accountEthAddr: string,
    completeCalldata: string
  ) {
    const data = await axios({
      method: "POST",
      url: `${this.apiUrl}/completeRequest`,
      data: {
        controller_eth_addr: controllerEthAddr,
        account_eth_addr: accountEthAddr,
        complete_calldata: completeCalldata,
      },
    });
    return data;
  }

  async getAccountSalt(accountCode: string, emailAddress: string) {
    const { data } = await axios({
      method: "POST",
      url: `${this.apiUrl}/getAccountSalt`,
      data: {
        account_code: accountCode,
        email_addr: emailAddress,
      },
    });
    return data;
  }
}

export const relayer = new Relayer(RELAYER_URL);
