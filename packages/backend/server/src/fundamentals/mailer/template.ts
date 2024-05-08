export const emailTemplate = ({
  title,
  content,
  buttonContent,
  buttonUrl,
  subContent,
}: {
  title: string;
  content: string;
  buttonContent?: string;
  buttonUrl?: string;
  subContent?: string;
}) => {
  return `<body style="background: #f6f7fb; overflow: hidden">
      <table
        width="100%"
        border="0"
        cellpadding="24px"
        style="
          background: #fff;
          max-width: 450px;
          margin: 32px auto 0 auto;
          border-radius: 16px 16px 0 0;
          box-shadow: 0px 0px 20px 0px rgba(66, 65, 73, 0.04);
        "
      >
        <tr>
          <td
            style="
              font-size: 20px;
              font-weight: 600;
              line-height: 28px;
              font-family: inter, Arial, Helvetica, sans-serif;
              color: #444;
              padding-top: 0;
            "
          >${title}</td>
        </tr>
        <tr>
          <td
            style="
              font-size: 15px;
              font-weight: 400;
              line-height: 24px;
              font-family: inter, Arial, Helvetica, sans-serif;
              color: #444;
              padding-top: 0;
            "
          >${content}</td>
        </tr>
        ${
          buttonContent && buttonUrl
            ? `<tr>
          <td style="margin-left: 24px; padding-top: 0; padding-bottom: ${
            subContent ? '0' : '64px'
          }">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="border-radius: 8px" bgcolor="#1E96EB">
                  <a
                    href="${buttonUrl}"
                    target="_blank"
                    style="
                      font-size: 15px;
                      font-family: inter, Arial, Helvetica, sans-serif;
                      font-weight: 600;
                      line-height: 24px;
                      color: #fff;
                      text-decoration: none;
                      border-radius: 8px;
                      padding: 8px 18px;
                      border: 1px solid rgba(0,0,0,.1);
                      display: inline-block;
                      font-weight: bold;
                    "
                    >${buttonContent}</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ''
        }
         ${
           subContent
             ? `<tr>
                <td
                  style="
                    font-size: 12px;
                    font-weight: 400;
                    line-height: 20px;
                    font-family: inter, Arial, Helvetica, sans-serif;
                    color: #444;
                    padding-top: 24px;
                  "
                >
                 ${subContent}
                </td>
              </tr>`
             : ''
         }
      </table>
    </body>`;
};
